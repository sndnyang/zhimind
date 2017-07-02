#!/usr/bin/env python 
# coding=utf-8
 
from mindmap import db
from ..models import uuid_gen

class Tutorial(db.Model):
    __tablename__ = 'tutorial'
    id = db.Column('tutor_id', db.String, primary_key=True, default=uuid_gen)
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'))
    title = db.Column(db.String(60))
    url = db.Column(db.String(300))
    type = db.Column(db.String(10))
    username = db.Column(db.String(20))
    like = db.Column(db.Integer, default=0)
    slug = db.Column(db.String(50), unique=True, index=True)
    content = db.Column(db.Text())
    
    def __init__(self, title, url, type="tutorial"):
        self.title = title
        self.url = url
        self.type = type

    def get_id(self):
        return self.id

    def get_url(self):
        return self.url

    def get_title(self):
        return self.title

