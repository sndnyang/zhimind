#!/usr/bin/env python 
# coding=utf-8
 
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import UniqueConstraint

from mindmap import db
from ..models import uuid_gen


class College(db.Model):
    __tablename__ = 'college'
    id = db.Column('college_id', db.String, primary_key=True, default=uuid_gen)
    name = db.Column(db.String(70))
    degree = db.Column(db.Integer)
    major = db.Column(db.String(10))
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
    int_docum_url = db.Column(db.String(250))
    info = db.Column(JSON)
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
        self.int_docum_url = college.int_docum_url
        self.info = college.info


class TempCollege(db.Model):
    __tablename__ = 'temp_college'
    id = db.Column('college_id', db.String, primary_key=True, default=uuid_gen)
    name = db.Column(db.String(70))
    degree = db.Column(db.Integer)
    major = db.Column(db.String(10))
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
    int_docum_url = db.Column(db.String(250))
    info = db.Column(JSON)
    
    def __init__(self, name, degree, major, site_url):
        self.name = name
        self.degree = degree
        self.major = major
        self.site_url = site_url


class University(db.Model):
    __tablename__ = 'university'
    id = db.Column('university_id', db.String, primary_key=True, default=uuid_gen)
    name = db.Column(db.String(70), unique=True)
    info = db.Column(JSON)

    def __init__(self, name, info):
        self.name = name
        self.info = info


class TempUniversity(db.Model):
    __tablename__ = 'temp_university'
    id = db.Column('university_id', db.String, primary_key=True, default=uuid_gen)
    name = db.Column(db.String(70), unique=True)
    info = db.Column(JSON)

    def __init__(self, name, info):
        self.name = name
        self.info = info
