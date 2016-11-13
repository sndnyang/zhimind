#coding=utf-8 
import re
import json
import requests

from xml.etree.ElementTree import tostring

from sympy import simplify_logic

import traceback

import unittest
from utility import *
from colortest import ColorTestRunner

def readFile(fn):
    fp = file(fn)
    content = fp.read()
    fp.close()
    return content

content = readFile('qa_test.txt')

class ProcessTestCase(unittest.TestCase):
    ##初始化工作
    def setUp(self):
        pass

    # 退出清理工作
    def tearDown(self):
        pass

    # 具体的测试用例，一定要以test开头
    def test_parse_block(self):
        qa, slug = qa_parse(content)
      # print qa['response']
        print qa['answer'][0]
      # print qa['comment']

  # def test_qa_parse_slug(self):
  #     qa, slug = qa_parse(content)
  #     self.assertEqual('svm-1-max-margin', slug, 'test slug fail')

  # def test_qa_parse_2(self):
  #     qa, slug = qa_parse(content)
  #     self.assertEqual('svm-1-max-margin', slug, 'test sum fail')

  # def test_check_process(self):
  #     qa, slug = qa_parse(content)
  #     s1 = qa['answer'][1]
  #     s3 = qa['answer'][3]
  #     print type(s1)

  #     self.assertEqual(True, True, 'test check choice fail')

  # def test_check_process2(self):
  #     qa, slug = qa_parse(content)
  #     print qa['answer'][2]
  #     f, r = checkText('ae', qa['answer'][2][0])
  #     self.assertEqual(f, False, 'test check text fail')

  # def test_check_text_3(self):
  #     qa, slug = qa_parse(content)
  #     f, r = checkText('eg', qa['answer'][2][0])
  #     self.assertEqual(f, False, 'test check text fail %s' % r)

  # def test_check_text_4(self):
  #     qa, slug = qa_parse(content)
#       f, r = checkText('hg', qa['answer'][2][0])
#       self.assertEqual(f, True, 'test check text fail')
   #def testsub(self):
   #    self.assertEqual(myclass.sub(2, 1), 1, 'test sub fail')


if __name__=='__main__':
    #unittest.main(testRunner = ColorTestRunner())
    unittest.main()
