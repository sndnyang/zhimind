# coding: utf-8

import os
import re
import json
import traceback
# from collections import defaultdict

import requests
from bs4 import BeautifulSoup


def contain_keys(href, keys, is_name=False):
    """

    """
    for e in keys:
        if is_name and re.search('%s' % e, href, re.I):
            return True
        if re.search(r'\b%s\b' % e, href, re.I):
            return True
        if re.search(r'_?%s_?' % e, href, re.I):
            return True
    return False


def format_url(href, domain, university_name):

    if href[0] == '/':
        full_url = domain + href
    elif href.startswith('http'):
        full_url = href
    elif href.startswith('//'):
        full_url = 'http:' + href
    elif href.find(university_name) > -1:
        full_url = 'http://' + href
    else:
        full_url = "Error!!!!!! at", href
    return full_url


class ResearchCrawler:
    """
    从院系的Faculty目录中爬取有内容的教授信息
    如研究兴趣、招生机会
    """

    def __init__(self):
        self.url = ""
        self.university_name = ""
        self.domain = ""
        self.example = ""
        self.key_words = None
        self.load_key()

    def crawl_from_directory(self, directory_url, example):
        """
        从目录爬
        """

        self.example = example
        self.url = directory_url
        self.university_name = re.search('(\w+).(edu|com|me|org|net)', self.url).group(1)
        self.domain = re.search('(http.+.(edu|com|me|org|net))/', self.url).group(1)
        # print self.university_name, self.domain

        soup, anchors = self.find_all_anchor(self.open_page(directory_url))
        index = self.find_example_index(anchors, example)
        print directory_url, len(anchors[index:]), 

        # 第一个教授主页的作用主要在这里——如果能再来一个更好
        # 求共同祖先
        count, links = self.find_faculty_list(anchors[index:], directory_url)
        print len(links)
        assert count >= url_check[url]

        for link in links:
            print self.dive_into_page(link)

        return links

    def load_key(self):
        with open('data/key.json') as fp:
            self.key_words = json.loads(fp.read(), strict=False)
        if self.key_words is None:
            return 'Error'

    def open_page(self, page_url):
        """

        """
        try:
            dir_name = re.search('(\w+).(edu|com|me|org|net)', page_url).group(1)
            dir_name = 'data/' + dir_name
            if not os.path.isdir(dir_name):
                os.mkdir(dir_name)
            file_name = os.path.join(dir_name, page_url.split('/')[-1] + '.html')

            if os.path.isfile(file_name):
                with open(file_name) as fp:
                    html = fp.read()
            else:
                r = requests.get(page_url)
                r.raise_for_status()
                html = r.content
                with open(file_name, 'w') as fp:
                    fp.write(html)
            return html
        except:
            traceback.print_exc()
            return "error"

    def find_all_anchor(self, html):
        """

        """
        soup = BeautifulSoup(html, 'html.parser')
        l = soup.find_all('a')
        return soup, l

    @staticmethod
    def find_name_in_emails(l):
        """

        """
        return [re.search(':(\w+)@', e.get("href")).group(1)
                for e in l if e.get("href") and re.search(':(\w+)@', e.get("href"))]

    def filter_list(self, e):
        name = e.string
        href = e.get('href')
        base_faculty_filter = [e for e in self.example.split('/')
                               if e and not e.startswith('http') and not e.endswith('.edu')]

        if href and '~' in href:
            return False
        elif name is not None and contain_keys(name, self.key_words['site_flag']):
            return False
        elif href and href.startswith('mailto:'):
            return True
        elif not href or len(href) < 5 or base_faculty_filter[0] not in href:
            # print href, ' base?'
            return True
        elif contain_keys(href, self.key_words['notprof']):
            return True
        elif not contain_keys(href, self.key_words['keys']):
            # print href, 'contain key?'
            return True
        return False

    def find_faculty_list(self, l, faculty_url):
        """

        """
        count = 0
        links = []
        # names = find_name_in_emails(l)
        # print names
        for e in l:
            if self.filter_list(e):
                continue

            href = e.get('href')
            faculty_link = format_url(href, self.domain, self.university_name)
            if faculty_link.startswith("Error"):
                print "Error!!!!!! at", href
                continue

            if faculty_link == faculty_url or faculty_link in links:
                continue
            links.append(faculty_link)
            count += 1

            name = e.string
            if name is not None and (re.search('Website', name, re.I) or
                                     re.search('personal', name, re.I)):
                # print "personal website:", faculty_link
                pass
            else:
                # print "faculty page:", faculty_link
                pass
        return count, links

    def find_example_index(self, l, a):
        self.domain = re.search('(http.+.(edu|com|me|org|net))/', a).group(1)
        for i in l:
            href = i.get("href")
            if not href:
                continue
            url = format_url(href, self.domain, self.university_name)
            if url == a:
                return l.index(i)
        return -1

    def dive_into_page(self, faculty_link):
        print faculty_link
        content = self.open_page(faculty_link)
        if content == 'error':
            print "Error!!!!!! at the link", faculty_link
            return "Error!!!!!! at the link", faculty_link

        soup, anchors = self.find_all_anchor(content)
        faculty_page, mail = self.get_personal_website(anchors, faculty_link)

        print 'page url: ', faculty_page,

        if not faculty_page:
            print "just this page"
            return '', mail, self.get_research_interests(soup, content)
        else:
            faculty_page = format_url(faculty_page, self.domain, self.university_name)
            print "div into"
            page_c = self.open_page(faculty_page)
            if page_c == 'error':
                print "Error!!!!!! at the page", faculty_page
                return '', mail, "error"
            else:
                soup, anchors = self.find_all_anchor(page_c)
                return faculty_page, mail, self.get_research_interests(soup, page_c)

    @staticmethod
    def onsocial(href):
        for e in ['facebook', 'twitter', 'google']:
            if e in href:
                return True
        return False

    def get_personal_website(self, l, faculty_url):
        potential_name = re.findall(r"([A-Z]?[a-z]+)", faculty_url[faculty_url.index(".edu") + 4:]) + ['personal']
        potential_name = [e for e in potential_name if not contain_keys(e, self.key_words['keys'] + self.key_words[
            'stop_word'] + self.key_words['notprof'] + ['people'])]
        faculty_page = ''
        mail = ''
        for a in l:
            href = a.get('href')
            if not href or len(href) < 5:
                continue
            if contain_keys(href, potential_name, True) and href not in faculty_url and not ResearchCrawler.onsocial(
                    href):
                if href.startswith('mailto:'):
                    mail = href
                else:
                    faculty_page = href
        return faculty_page, mail

    def extract_from_line(self, line):
        """

        """
        flag = re.search("(Research|interests)", line, re.I).group(1)
        pos = line.find(flag)
        if pos < 0:
            pos = 0
        else:
            pos = pos + len(flag)
        for x in self.key_words['replace']:
            line = re.sub(r'\b%s\b' % x, ',', line)
        if line[-1] == '.':
            line[-1] = ''
        return [x.strip() for x in line[pos:].split(',') if x and x.strip()]

    def get_research_interests(self, soup, content):
        """
        
        """
        pattern = re.compile('<(\w+)>(\s*\w*\s*(Research|interests)[^<.]*)(<|.)', re.I)
        result = pattern.search(content)
        if not result:
            return "not found"

        tag = result.group(1)
        s = result.group(2)
        print tag, s
        if len(s) > 19 or s[-1] == '.':
            print "by line"
            research_tags = self.extract_from_line(s)
            return research_tags

        print 'tag', tag
        x = soup.find_all(tag, string=s)
        # print x
        if len(x) == 0:
            return "not found"
        elif len(x) > 1:
            return "too much"

        node = x[0]
        next_node = node.find_next_sibling()
        # print next_node
        # print next_node.name
        tags = []
        if next_node.name == 'ul':
            tags = [e for e in next_node.strings if e.strip()]
            return tags
        for n in node.find_next_siblings():
            if n.name != next_node.name:
                break
            tags.append(n.string)


if __name__ == "__main__":
    # url = "http://cs.mines.edu/CS-Faculty"

    urls = ['http://cs.mines.edu/CS-Faculty',
            'http://science.iit.edu/computer-science/people/faculty',
            'http://cms.bsu.edu/academics/collegesanddepartments/computerscience/facultyandstaff/faculty',
            'http://www.memphis.edu/cs/people/index.php',
            'http://www.smu.edu/Lyle/Departments/CSE/People/Faculty',
            'https://www.csuohio.edu/engineering/eecs/faculty-staff',
            'http://computerscience.engineering.unt.edu/content/faculty',
            'https://www.odu.edu/compsci/research',
            'http://www.cs.ucf.edu/people/index.php',
            ]
    examples = ['https://inside.mines.edu/CS-Faculty-and-Staff/TracyCamp',
                'http://science.iit.edu/people/faculty/eunice-santos',
                'http://cms.bsu.edu/academics/collegesanddepartments/computerscience/facultyandstaff/faculty/buispaul',
                'http://www.memphis.edu/cs/people/faculty_pages/william-baggett.php',
                'http://www.smu.edu/Lyle/Departments/CSE/People/Faculty/ThorntonMitchell',
                'https://www.csuohio.edu/engineering/charles-k-alexander-professor',
                'http://www.cse.unt.edu/~rakl',
                'https://www.odu.edu/directory/people/a/achernik',
                'http://www.cs.ucf.edu/~bagci',
                ]

    url_check = {'http://cs.mines.edu/CS-Faculty': 15,
                 'http://science.iit.edu/computer-science/people/faculty': 52,
                 'http://cms.bsu.edu/academics/collegesanddepartments/computerscience/facultyandstaff/faculty': 19,
                 'http://www.memphis.edu/cs/people/index.php': 16,
                 'http://www.smu.edu/Lyle/Departments/CSE/People/Faculty': 17,
                 'https://www.csuohio.edu/engineering/eecs/faculty-staff': 32,
                 'http://computerscience.engineering.unt.edu/content/faculty': 34,
                 'https://www.odu.edu/compsci/research': 15,
                 'http://www.cs.ucf.edu/people/index.php': 54,
                 }

    crawler = ResearchCrawler()
    for url in urls[0:1]:
        crawler.crawl_from_directory(url, examples[urls.index(url)])

        # i = 1
        # directory_url = urls[i]
        # example = examples[i]
        # self.university_name = re.search('(\w+).edu', directory_url).group(1)
        # soup, anchors = find_all_anchor(self.open_page(directory_url))
        # print directory_url, len(anchors)
        # count, links = find_faculty_list(anchors, directory_url, example)
        # print count, url_check[directory_url]
        # assert count >= url_check[directory_url]

        # soup, anchors = find_all_faculty_tag(self.open_page(self.url))
        # for d in anchors:
        #     try:
        #         print d.parent.name, d.parent.find_all('a')
        #     except:
        #         pass
