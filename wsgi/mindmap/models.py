#!/usr/bin/env python 
#coding=utf-8 
 
from datetime import datetime

import uuid

from sqlalchemy.dialects.postgresql import JSON
from werkzeug.security import generate_password_hash, check_password_hash

from mindmap import app, db

def uuid_gen():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = "users"
    id = db.Column('user_id', db.String, primary_key=True, default=uuid_gen)
    username = db.Column('username', db.String(20), unique=True , index=True)
    password = db.Column('password', db.String(250))
    email = db.Column('email', db.String(50), unique=True, index=True)
    registered_on = db.Column('registered_on', db.DateTime)
    last_edit = db.Column('last_edit', db.DateTime)

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
 
    def check_frequence(self, now):
        app.logger.debug(self.last_edit)
        app.logger.debug(not self.last_edit)
        if not self.last_edit:
            return True
        differ = (now - self.last_edit).seconds
        if differ >= 60:
            return True
        else:
            return False

    def __repr__(self):
        return '<User %r>' % (self.username)


class MindMap(db.Model):
    __tablename__ = 'mindmap'
    id = db.Column('mindmap_id', db.String, primary_key=True, default=uuid_gen)
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
    id = db.Column('entry_id', db.String, primary_key=True, default=uuid_gen)
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'))
    mindmap_id = db.Column(db.String, db.ForeignKey('mindmap.mindmap_id'))
    tutor_id = db.Column(db.String, db.ForeignKey('tutorial.tutor_id'))
    name = db.Column(db.String(60))
    parent = db.Column(db.String(60))
    mastery = db.Column(db.Integer)

    def __init__(self, name, parent):
        self.name = name
        self.parent = parent
        self.mastery = 0


class Tutorial(db.Model):
    __tablename__ = 'tutorial'
    id = db.Column('tutor_id', db.String, primary_key=True, default=uuid_gen)
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'))
    title = db.Column(db.String(60))
    url = db.Column(db.String(250))
    
    def __init__(self, title, url):
        self.title = title
        self.url = url

    def get_id(self):
        return self.id

    def get_url(self):
        return self.url

    def get_title(self):
        return self.title
