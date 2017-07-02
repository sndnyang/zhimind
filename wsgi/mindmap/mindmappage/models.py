#!/usr/bin/env python 
# coding=utf-8
 
import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import JSON

from mindmap import db


class MindMap(db.Model):
    __tablename__ = 'mindmap'
    id = db.Column('mindmap_id', db.String, primary_key=True, 
                   default=str(uuid.uuid4()))
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'))
    title = db.Column(db.String(60))
    map = db.Column(JSON)
    last_edit = db.Column('last_edit', db.DateTime)

    def __init__(self, title, json):
        self.title = title
        self.map = json
        self.last_edit = datetime.now()

    def get_id(self):
        return self.id

    def get_user_id(self):
        return str(self.user_id)


class EntryMastery(db.Model):
    __tablename__ = 'entry_mastery'
    id = db.Column('entry_id', db.String, primary_key=True,
                   default=str(uuid.uuid4()))
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'))
    tutor_id = db.Column(db.String, db.ForeignKey('tutorial.tutor_id'))
    name = db.Column(db.String(60))
    mastery = db.Column(db.Integer, default=1)

    def __init__(self, tutor_id):
        self.tutor_id = tutor_id
        self.mastery = 0
