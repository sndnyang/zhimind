# -*- coding:utf-8 -*-
#创建一个socketserverTCP服务器
#高级模块，简化客户和服务器的实现

import socketserver

import jieba
# Create a Request Handler

# In this TCP server case - the request handler is derived from
# StreamRequestHandler

class MyTCPRequestHandler(socketserver.StreamRequestHandler):

    def handle(self):
        # Receive and print the data received from client
        print("receive one")
        msg = self.rfile.readline().strip()
        words = jieba.tokenize(msg.decode("utf8"), mode="search")
        msg = "%s\n" % '/'.join("%s#%s#%s" % (w, s, e) for w,s,e in words)
        print(msg)
        print(len(msg))
        self.wfile.write(msg.encode())

# Create a TCP Server instance
aServer = socketserver.TCPServer(("127.0.0.1", 9090),
        MyTCPRequestHandler)

# Listen for ever
aServer.serve_forever()

