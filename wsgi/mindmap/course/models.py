#!/usr/bin/env python 
# coding=utf-8

# from sqlalchemy_searchable import make_searchable
# from sqlalchemy_searchable import SearchQueryMixin
# from sqlalchemy_utils.types import TSVectorType
# from flask_sqlalchemy import BaseQuery

from mindmap import db
from ..models import uuid_gen

# make_searchable()
# class ArticleQuery(BaseQuery, SearchQueryMixin):
#    pass


class Tutorial(db.Model):
    __tablename__ = 'tutorial'
    __searchable__ = ['title']
    # query_class = ArticleQuery
    id = db.Column('tutor_id', db.String, primary_key=True, default=uuid_gen)
    user_id = db.Column(db.String, db.ForeignKey('users.user_id'))
    title = db.Column(db.String(60))
    url = db.Column(db.String(300))
    type = db.Column(db.String(10))
    username = db.Column(db.String(20))
    like = db.Column(db.Integer, default=0)
    slug = db.Column(db.String(50), index=True)
    content = db.Column(db.Text())
    # title_vector = db.Column(TSVectorType('title'))
    __table_args__ = (db.UniqueConstraint('user_id', 'slug'), {})
    
    def __init__(self, title, url, name="tutorial"):
        self.title = title
        self.url = url
        self.type = name

    def get_id(self):
        return self.id

    def get_url(self):
        return self.url

    def get_title(self):
        return self.title
