# -*- coding:utf-8 -*-
import os

from flask import request, flash, url_for, redirect, render_template, g,\
session, jsonify

from flask.ext.login import LoginManager, current_user, logout_user, \
login_user, login_required

from mindmap import app, db, login_manager

from models import User, MindMap, EntryMastery

from forms import *

from validation import *

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/save', methods=['POST'])
@login_required
def save_map():
    if request.method == 'GET':
        return ""
    data = request.json.get('data', '')
    title = request.json.get('title', 'default')
    mindmap = MindMap(title, data)
    mindmap.user = g.user

    app.logger.debug('json is' + str(data) + typeof(data))

    return jsonify({'x':10, 'y':100})
    

@app.route('/verifycode')
def verify_code():
    code_img, strs = create_validate_code() 
    session['code_text'] = strs
    app.logger.debug(strs)
    buf = StringIO.StringIO() 
    code_img.save(buf,'JPEG',quality=70) 
 
    buf_str = buf.getvalue() 
    response = app.make_response(buf_str)  
    response.headers['Content-Type'] = 'image/jpeg'
    return response


@app.route('/register', methods=['GET', 'POST'])
def register():

    if g.user is not None and g.user.is_authenticated:
        return redirect(url_for('index'))

    form = RegistrationForm(request.form)
    if request.method == 'POST' and form.validate():
        code_text = session['code_text']
        app.logger.debug(code_text + '  ' + form.verification_code.data)

        if form.verification_code.data == code_text:
            user = User(request.form['username'] , request.form['password'],request.form['email'])
            try:
                db.session.add(user)
                db.session.commit()
                flash('User successfully registered')
                return redirect(url_for('login'))
            except:
                #app.logger.error(traceback.print_exc())
                db.session.rollback()
                flash(u'注册失败')
        else:
            flash(u'验证码错误')

    
    return render_template('register.html', form=form)
 

@app.route('/login',methods=['GET','POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')

    username = request.form['username']
    password = request.form['password']
    remember_me = False
    if 'remember_me' in request.form:
        remember_me = True

    registered_user = User.query.filter_by(username=username).first()
    if registered_user is None:
        flash('Username is invalid' , 'error')
        return redirect(url_for('login'))
    if not registered_user.check_password(password):
        flash('Password is invalid','error')
        return redirect(url_for('login'))
    login_user(registered_user, remember = remember_me)
    flash('Logged in successfully')
    return redirect(request.args.get('next') or url_for('index'))


@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))


@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))


@app.before_request
def before_request():
    g.user = current_user
