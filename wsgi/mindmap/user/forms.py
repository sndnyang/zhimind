# coding=utf-8 

from wtforms import Form, PasswordField, SubmitField, StringField, BooleanField, validators


class AccountForm(Form):
    appname = StringField(u'应用名', [validators.Length(min=2, max=50)])
    username = StringField(u'用户名', [validators.Length(min=4, max=25)])
    hint = StringField(u'提示', [validators.Length(min=6, max=100)])
    password = PasswordField(u'密码', [
        validators.Length(min=8, max=50),
        validators.DataRequired(),
        validators.EqualTo('confirm', message='Passwords must match')
    ])
    confirm = PasswordField(u'确认密码')
    cover = BooleanField('覆盖密码')
    submit = SubmitField(u'记录')

