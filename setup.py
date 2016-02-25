from setuptools import setup

setup(name='FlaskApp',
      version='1.0',
      description='A app with mindmap and better than mindmap',
      author='sndnyang',
      author_email='sndnyangd@gmail.com',
      url='http://sndnyang.github.io',
     install_requires=['Flask>=0.10.1', 'flask-login==0.2.7', 'sqlalchemy==0.8.2', 'flask-sqlalchemy==1.0' ],
     )
