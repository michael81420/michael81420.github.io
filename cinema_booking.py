# Cinema booking system — LLD mock

class Seat():
    def __init__(row : int, col: int):
        self.row = row
        self.col = col
        

class Room():
    def __init__(seats: list[Seat]):
        self.avaliable = {}

        for seat in seats:
            self.avaliable[seat] = True

    def register(seat):
        if not self.avaliable[seat]:
            return False
        
        self.avaliable[seat] = False
        return True

class TicketSalser():
    def __init__(rooms: list[Room], play_list: dict[str, dict[Date, int]]):
        # self.rooms = rooms
        self.status = {}

        for movoie, schedules in play_list:
            for time, room_id in schedules:
                self.play_list[movie][time] = rooms[room_id].copy()

    def book(user_id : int, room : Room, time: Date, seat: Seat, movie: string) -> Ticket:
        thread.Lock()

        success = self.play_list[movie][time].register(seat)

        return success
