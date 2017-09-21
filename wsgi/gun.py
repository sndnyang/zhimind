#!/bin/python
# coding:utf-8

import os
import gevent.monkey
gevent.monkey.patch_all()

import multiprocessing

debug = False #True
loglevel = 'debug'
bind = '0.0.0.0:8000'
pidfile = os.path.join(os.environ.get('ZHIMIND_DIR', '..'), 'logs/gunicorn.pid')
logfile = os.path.join(os.environ.get('ZHIMIND_DIR', '..'), 'logs/debug.log')

#启动的进程数
workers = multiprocessing.cpu_count() * 2
worker_class = 'gunicorn.workers.ggevent.GeventWorker'

x_forwarded_for_header = 'X-FORWARDED-FOR'

timeout=300