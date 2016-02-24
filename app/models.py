#!/usr/bin/env python 
#coding=utf-8 
 
from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

from app import app

db = SQLAlchemy(app)

class User(db.Model):
    __tablename__ = "users"
    id = db.Column('user_id',db.Integer , primary_key=True)
    username = db.Column('username', db.String(20), unique=True , index=True)
    password = db.Column('password' , db.String(15))
    email = db.Column('email', db.String(50), unique=True, index=True)
    registered_on = db.Column('registered_on', db.DateTime)

    def __init__(self , username ,password , email):
        self.username = username
        self.password = password
        self.email = email
        self.registered_on = datetime.utcnow()

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

class Todo(db.Model):
    __tablename__ = 'todos'
    id = db.Column('todo_id', db.Integer, primary_key=True)
    title = db.Column(db.String(60))
    text = db.Column(db.String)
    done = db.Column(db.Boolean)
    pub_date = db.Column(db.DateTime)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))

    def __init__(self, title, text):
        self.title = title
        self.text = text
        self.done = False
        self.pub_date = datetime.utcnow()
