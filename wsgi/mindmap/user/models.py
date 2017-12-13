#!/usr/bin/env python 
# coding=utf-8
 
from hashlib import md5
from datetime import datetime

import uuid

from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import UniqueConstraint

from mindmap import db


def uuid_gen():
    return str(uuid.uuid4())


class Account(db.Model):
    __tablename__ = "account"
    id = db.Column('user_id', db.String, primary_key=True, default=uuid_gen)
    appname = db.Column('appname', db.String(50), index=True)
    username = db.Column('username', db.String(20), index=True)
    password = db.Column('password', db.String(250))
    hint = db.Column('hint', db.String(100), index=True)
    registered_on = db.Column('registered_on', db.DateTime)
    __table_args__ = (UniqueConstraint('appname', 'username', name='_app_user'),)

    def __init__(self, appname, username, password, hint):
        self.appname = appname
        self.username = username
        self.password = generate_password_hash(password)
        self.hint = hint
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

    def __repr__(self):
        return u'<Account %r>' % self.username


