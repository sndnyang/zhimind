import os

from flask import request, flash, url_for, redirect, \
     render_template, g


from flask.ext.login import LoginManager, current_user, logout_user, \
login_user, login_required

from werkzeug.security import generate_password_hash, check_password_hash


from app import app
from models import User, db

login_manager = LoginManager()
login_manager.init_app(app)

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')

#@app.route('/<path:resource>')
#def serveStaticResource(resource):
#    return send_from_directory('static/', resource)

@app.route('/register', methods=['GET', 'POST'])
def register():
   #code_img,strs = create_validate_code() 
   #buf = StringIO.StringIO() 
   #code_img.save(buf,'JPEG',quality=70) 
 
   #buf_str = buf.getvalue() 
   #response = app.make_response(buf_str)  
   #response.headers['Content-Type'] = 'image/jpeg'  
   #return response
    if request.method == 'GET':
        return render_template('register.html')
    user = User(request.form['username'] , request.form['password'],request.form['email'])
    db.session.add(user)
    db.session.commit()
    flash('User successfully registered')
    return redirect(url_for('login'))
 
@app.route('/login',methods=['GET','POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    return redirect(url_for('index'))

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
