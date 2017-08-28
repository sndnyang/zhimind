#!/usr/bin/env python 
# coding=utf-8
 
from sqlalchemy.dialects.postgresql import JSON

from mindmap import db
from ..models import uuid_gen


class ReciteWord(db.Model):
    __tablename__ = 'ReciteWord'
    id = db.Column('recite_id', db.String, primary_key=True, default=uuid_gen)
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'))
    book_name = db.Column(db.String(30))
    data = db.Column(JSON)

    def __init__(self, user_id, book_name, json):
        self.user_id = user_id
        self.book_name = book_name
        self.data = json

    def get_data(self):
        return self.data
