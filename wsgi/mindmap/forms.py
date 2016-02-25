﻿# coding=utf-8 
 
from flask_wtf import RecaptchaField 
from wtforms import Form, BooleanField, TextField, PasswordField, SubmitField,\
StringField, validators

class RegistrationForm(Form):
    username = TextField(u'用户名', [validators.Length(min=4, max=25)])
    email = TextField('Email', [validators.Length(min=6, max=50)])
    password = PasswordField(u'密码', [
        validators.Length(min=8, max=50),
        validators.Required(),
        validators.EqualTo('confirm', message='Passwords must match')
    ])
    confirm = PasswordField(u'确认密码')
    verification_code = StringField(u'验证码', 
            validators=[validators.Required(), validators.Length(4, 4, message=u'填写4位验证码')])
    #recaptcha = RecaptchaField()
    submit = SubmitField(u'注册')
    #accept_tos = BooleanField('I accept the TOS', [validators.Required()])
