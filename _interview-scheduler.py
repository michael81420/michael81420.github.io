"""
Amazon LLD mock — Job Scheduler（參考解）

需求（面試中問出來的）:
  - 提交 (要執行的內容, 執行時間) -> 回傳 job id
  - 只支援「未來某個時間點執行一次」，週期性 cron 不做
  - 可同時執行多個任務，worker 數固定 (預設 10)
  - worker 全忙時要等，不能無限開執行緒

刻意不做（面試中主動講出來，比默默跳過分數高）:
  - 取消任務：加一個 cancelled set，dispatch 時跳過即可
  - 失敗重試：包一層 RetryPolicy，重算 run_at 後丟回 heap
  - 持久化：現在全在記憶體，process 掛掉任務就沒了
  - cron / 週期任務：執行完把下一次的時間再 push 回 heap

核心機制:
  min-heap 依執行時間排序 + Condition。
  dispatcher 睡到「堆頂時間 - 現在」，插入更早的任務時被 notify 叫醒重算。
  到期的任務丟進 thread-safe queue，N 個 worker 各自 blocking get —— 
  所以不用追蹤誰 idle 誰 busy，也不用自己寫第二把鎖。
"""

import heapq
import itertools
import queue
import threading
import time
from typing import Callable


class Job:
    __slots__ = ("id", "run_at", "fn", "seq")

    def __init__(self, job_id: str, run_at: float, fn: Callable[[], None], seq: int):
        self.id, self.run_at, self.fn, self.seq = job_id, run_at, fn, seq

    def __lt__(self, other: "Job") -> bool:
        # seq 當 tie-breaker：兩個 job 同時間時，沒有它 heapq 會去比 fn 而爆 TypeError
        return (self.run_at, self.seq) < (other.run_at, other.seq)


class JobScheduler:
    def __init__(self, workers: int = 10, queue_size: int = 100):
        self._heap: list[Job] = []
        self._cv = threading.Condition()          # 鎖 + 等待；保護的共享狀態只有 _heap
        self._ready: queue.Queue = queue.Queue(maxsize=queue_size)  # 滿了 put 會擋 = backpressure
        self._seq = itertools.count()
        self._n_workers = workers
        self._running = False
        self._threads: list[threading.Thread] = []

    # ---------- 對外 API ----------

    def submit(self, fn: Callable[[], None], run_at: float) -> str:
        with self._cv:
            seq = next(self._seq)
            job = Job(f"job-{seq}", run_at, fn, seq)
            # 判斷跟 push 必須在同一把鎖內，否則判斷完到 notify 之間會漏掉喚醒
            is_earliest = not self._heap or job < self._heap[0]
            heapq.heappush(self._heap, job)
            if is_earliest:
                self._cv.notify()                 # 只有變成新的最早任務才需要吵醒 dispatcher
        return job.id

    def start(self) -> None:
        self._running = True
        self._threads = [threading.Thread(target=self._dispatch_loop, daemon=True)]
        self._threads += [
            threading.Thread(target=self._worker_loop, daemon=True)
            for _ in range(self._n_workers)
        ]
        for t in self._threads:
            t.start()

    def stop(self) -> None:
        with self._cv:
            self._running = False
            self._cv.notify_all()
        for _ in range(self._n_workers):
            self._ready.put(None)                 # 毒丸：讓卡在 get() 的 worker 收工
        for t in self._threads:
            t.join(timeout=2)

    # ---------- 內部 ----------

    def _dispatch_loop(self) -> None:
        while True:
            with self._cv:
                while self._running and not self._heap:
                    self._cv.wait()               # 沒任務就無限等，等 submit 叫醒
                if not self._running:
                    return
                wait_for = self._heap[0].run_at - time.time()
                if wait_for > 0:
                    self._cv.wait(timeout=wait_for)
                    continue                      # 醒來一律重新檢查：可能是被更早的任務叫醒的
                job = heapq.heappop(self._heap)
            self._ready.put(job)                  # 放鎖外：put 可能阻塞，不能占著鎖睡

    def _worker_loop(self) -> None:
        while True:
            job = self._ready.get()
            if job is None:
                return
            try:
                job.fn()
            except Exception as e:                # 一個任務炸掉不能弄死 worker
                print(f"[{job.id}] failed: {e!r}")
            finally:
                self._ready.task_done()


if __name__ == "__main__":
    done: queue.Queue = queue.Queue()

    def boom():
        raise RuntimeError("boom")

    s = JobScheduler(workers=2)
    s.start()
    now = time.time()

    s.submit(lambda: done.put("late"), now + 0.9)
    s.submit(boom, now + 0.5)                     # 失敗的任務不能拖垮 worker
    time.sleep(0.1)
    s.submit(lambda: done.put("early"), now + 0.3)  # 比堆頂早 → 必須叫醒 dispatcher 重算

    order = [done.get(timeout=3) for _ in range(2)]
    assert order == ["early", "late"], order
    print("OK:", order)
    s.stop()
