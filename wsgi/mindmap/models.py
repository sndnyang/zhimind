#!/usr/bin/env python 
# coding=utf-8
 
from hashlib import md5
from datetime import datetime

import uuid

from sqlalchemy.dialects.postgresql import JSON
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import UniqueConstraint

from mindmap import app, db

def uuid_gen():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = "users"
    id = db.Column('user_id', db.String, primary_key=True, default=uuid_gen)
    username = db.Column('username', db.String(20), unique=True, index=True)
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
 
    def get_name(self):
        return unicode(self.username)

    def check_frequence(self, now):
        if not self.last_edit:
            return True
        differ = (now - self.last_edit).seconds
        if differ >= 60:
            return True
        else:
            return False

    def avatar(self, size):
        return 'http://www.gravatar.com/avatar/' + md5(self.email).hexdigest() + '?d=mm&s=' + str(size)

    def __repr__(self):
        return '<User %r>' % (self.username)


