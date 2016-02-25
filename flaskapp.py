import os
from datetime import datetime
from flask import Flask, request, flash, url_for, redirect, \
     render_template, abort, send_from_directory

from flask.ext.login import LoginManager

from app import *

app = Flask(__name__)
app.config.from_pyfile('flaskapp.cfg')

login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/<path:resource>')
def serveStaticResource(resource):
    return send_from_directory('static/', resource)

@app.route("/test")
def test():
    return "<strong>It's Alive!</strong>"

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

if __name__ == '__main__':
    app.run(debug = True)
