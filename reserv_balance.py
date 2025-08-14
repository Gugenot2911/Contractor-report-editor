import polars as pl


class Reserv:

    def __init__(self, reserv_position):
        self.reserv_position = reserv_position

    def add_position(self, position:dict|list):

        data = []
        if isinstance(position, list):
            for items in position:
                data.append(items)
        else:
            data.append(position)

        return data

