#!/usr/bin/env python 
# coding=utf-8
 
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
    tutor_id = db.Column(db.String, db.ForeignKey('tutorial.tutor_id'))
    name = db.Column(db.String(60))
    mastery = db.Column(db.Integer, default=1)

    def __init__(self, tutor_id):
        self.tutor_id = tutor_id
        self.mastery = 0


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


class College(db.Model):
    __tablename__ = 'college'
    id = db.Column('college_id', db.String, primary_key=True, default=uuid_gen)
    name = db.Column(db.String(70))
    degree = db.Column(db.Integer)
    major = db.Column(db.Integer)
    site_url = db.Column(db.String(250))
    gpa = db.Column(db.Float)
    gpa_url = db.Column(db.String(250))
    tuition = db.Column(db.Float)
    tuition_url = db.Column(db.String(250))
    fall = db.Column(db.String(20))
    spring = db.Column(db.String(20))
    deadline_url = db.Column(db.String(250))
    toefl = db.Column(db.Integer)
    ielts = db.Column(db.Float)
    eng_url = db.Column(db.String(250))
    gre = db.Column(db.String(20))
    gre_url = db.Column(db.String(250))
    rl = db.Column(db.String(10))
    evalue = db.Column(db.String(10))
    finance = db.Column(db.String(10))
    docum_url = db.Column(db.String(250))
    __table_args__ = (UniqueConstraint('name', 'degree', 'major', 
        name='_degree_major'),)
    
    def __init__(self, name, degree, major, site_url):
        self.name = name
        self.degree = degree
        self.major = major
        self.site_url = site_url

    def set(self, college):
        self.gpa = college.gpa
        self.gpa_url = college.gpa_url
        self.tuition = college.tuition
        self.tuition_url = college.tuition_url
        self.fall = college.fall
        self.spring = college.spring
        self.deadline_url = college.deadline_url
        self.toefl = college.toefl
        self.ielts = college.ielts
        self.eng_url = college.eng_url
        self.gre = college.gre
        self.gre_url = college.gre_url
        self.rl = college.rl
        self.evalue = college.evalue
        self.finance = college.finance
        self.docum_url = college.docum_url


class TempCollege(db.Model):
    __tablename__ = 'temp_college'
    id = db.Column('college_id', db.String, primary_key=True, default=uuid_gen)
    name = db.Column(db.String(70))
    degree = db.Column(db.Integer)
    major = db.Column(db.Integer)
    site_url = db.Column(db.String(250))
    gpa = db.Column(db.Float)
    gpa_url = db.Column(db.String(250))
    tuition = db.Column(db.Float)
    tuition_url = db.Column(db.String(250))
    fall = db.Column(db.String(20))
    spring = db.Column(db.String(20))
    deadline_url = db.Column(db.String(250))
    toefl = db.Column(db.Integer)
    ielts = db.Column(db.Float)
    eng_url = db.Column(db.String(250))
    gre = db.Column(db.String(20))
    gre_url = db.Column(db.String(250))
    rl = db.Column(db.String(10))
    evalue = db.Column(db.String(10))
    finance = db.Column(db.String(10))
    docum_url = db.Column(db.String(250))
    
    def __init__(self, name, degree, major, site_url):
        self.name = name
        self.degree = degree
        self.major = major
        self.site_url = site_url

