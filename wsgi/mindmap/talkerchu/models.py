#!/usr/bin/env python 
# coding=utf-8
 
from sqlalchemy.dialects.postgresql import JSON

from mindmap import db
from ..models import uuid_gen


class Episode(db.Model):
    __tablename__ = 'episode'
    id = db.Column('epis_id', db.String, primary_key=True, default=uuid_gen)
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'))
    name = db.Column(db.String(30))
    no = db.Column(db.Integer)
    data = db.Column(JSON)

    def __init__(self, user_id, name, no, json):
        self.user_id = user_id
        self.name = name
        self.no = no
        self.data = json

    def get_data(self):
        return self.data
