# -*- coding:utf-8 -*-

from __future__ import unicode_literals
import os
import re
from socket import *
from whoosh.analysis import RegexAnalyzer, LowercaseFilter, StopFilter, StemFilter
from whoosh.analysis import Tokenizer, Token
from whoosh.lang.porter import stem

import logging
logger = logging.getLogger('checker')
fmter = logging.Formatter('%(asctime)s %(levelname)s %(message)s', datefmt='%a, %d %b %Y %H:%M:%S')
log_file_name = os.path.join(os.environ.get('OPENSHIFT_PYTHON_LOG_DIR', '.'),
                             'answers.log')
hdlr = logging.StreamHandler()
hdlr.setLevel(logging.INFO)
hdlr.setFormatter(fmt=fmter)
logger.addHandler(hdlr=hdlr)
logger.setLevel(logging.INFO)

STOP_WORDS = frozenset(('a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can',
                        'for', 'from', 'have', 'if', 'in', 'is', 'it', 'may',
                        'not', 'of', 'on', 'or', 'tbd', 'that', 'the', 'this',
                        'to', 'us', 'we', 'when', 'will', 'with', 'yet',
                        'you', 'your', '的', '了', '和'))

accepted_chars = re.compile(r"[\u4E00-\u9FD5]+")

host = '127.0.0.1'
port = 9090
bufsiz = 1024
addr = (host, port)

class ChineseTokenizer(Tokenizer):

    def __call__(self, text, **kargs):
        tcpClientSock = socket(AF_INET,SOCK_STREAM)
        tcpClientSock.connect(addr)
        msg = '%s\n' % text
        # logger.info("call")
        # logger.info(len(text))
        tcpClientSock.send(msg.encode())
        words = tcpClientSock.recv(bufsiz)
        # logger.info(words)
        tcpClientSock.close()
        # words = jieba.tokenize(text, mode="search")
        token = Token()
        # logger.info(len(words))
        for e in words.decode().strip().split("/"):

            fields = e.split("#")
            if len(fields) != 3:
                continue
            w, start_pos, stop_pos = fields
            if not accepted_chars.match(w) and len(w) <= 1:
                continue
            # logger.info(len(w))
            token.original = token.text = w
            token.pos = int(start_pos)
            token.startchar = int(start_pos)
            token.endchar = int(stop_pos)
            yield token


def ChineseAnalyzer(stoplist=STOP_WORDS, minsize=1, stemfn=stem, cachesize=50000):
    dealer = ChineseTokenizer() 
    return (dealer | LowercaseFilter() |
            StopFilter(stoplist=stoplist, minsize=minsize) |
            StemFilter(stemfn=stemfn, ignore=None, cachesize=cachesize))
