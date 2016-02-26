#!/usr/bin/env python 
#coding=utf-8 
 
from datetime import datetime

from sqlalchemy.dialects.postgresql import JSON
from werkzeug.security import generate_password_hash, check_password_hash

from mindmap import app, db

class User(db.Model):
    __tablename__ = "users"
    id = db.Column('user_id',db.Integer , primary_key=True)
    username = db.Column('username', db.String(20), unique=True , index=True)
    password = db.Column('password', db.String(250))
    email = db.Column('email', db.String(50), unique=True, index=True)
    registered_on = db.Column('registered_on', db.DateTime)

    def __init__(self , username ,password , email):
        self.username = username
        self.password = generate_password_hash(password)
        self.email = email
        self.registered_on = datetime.now()

    def set_password(self , password):
        self.password = generate_password_hash(password)

    def check_password(self , password):
        return check_password_hash(self.password , password)

    def is_authenticated(self):
        return True
 
    def is_active(self):
        return True
 
    def is_anonymous(self):
        return False
 
    def get_id(self):
        return unicode(self.id)
 
    def __repr__(self):
        return '<User %r>' % (self.username)


class MindMap(db.Model):
    __tablename__ = 'mindmap'
    id = db.Column('mindmap_id', db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    title = db.Column(db.String(60))
    map = db.Column(JSON)
    last_edit = db.Column('last_edit', db.DateTime)

    def __init__(self, title, json):
        self.title = title
        self.map = json
        self.last_edit = datetime.now()

    def check_frequence(self, now):
        differ = (now - self.last_edit).seconds
        if differ >= 60:
            return True
        else:
            return False

class EntryMastery(db.Model):
    __tablename__ = 'entry_mastery'
    id = db.Column('entry_id', db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    mindmap_id = db.Column(db.Integer, db.ForeignKey('mindmap.mindmap_id'))
    name = db.Column(db.String(60))
    parent = db.Column(db.String(60))
    mastery = db.Column(db.Integer)

    def __init__(self, name, parent):
        self.name = name
        self.parent = parent
        self.mastery = 0

