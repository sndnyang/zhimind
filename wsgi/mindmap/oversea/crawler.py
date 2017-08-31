# coding: utf-8

import os
import re
import json
import traceback

import requests
from bs4 import BeautifulSoup



def contain_keys(href, keys, is_name=False):
    """

    """
    words = "(%s)" % '|'.join(e for e in keys)
    if is_name and re.search('%s' % words, href, re.I):
        return True
    if re.search(r'\b%s\b' % words, href, re.I):
        return True
    if re.search(r'_?%s_?' % words, href, re.I):
        return True
    return False


def format_url(href, domain):

    if href[0] == '/' and (len(href) == 1 or href[1] != '/'):
        full_url = domain + href
    elif href.startswith('http'):
        full_url = href
    elif href.startswith('//'):
        full_url = 'http:' + href
    elif href.find(domain) > -1:
        full_url = 'http://' + href
    else:
        full_url = "Error!!!!!! at", href
    return full_url


def get_and_store_page(page_url):
    parts = page_url.split("/")[2].split(".")
    university_name = parts[-2]
    dir_name = 'data/' + university_name
    if not os.path.isdir(dir_name):
        os.mkdir(dir_name)
    file_name = dir_name+'/' + page_url.split('/')[-1] if page_url[-1] != '/' else page_url.split('/')[-2] + '.html'
    if os.path.isfile(file_name):
        with open(file_name) as fp:
            html = fp.read()
    else:
        try:
            r = requests.get(page_url, time=10)
            r.raise_for_status()
            html = r.content
        except:
            html = "Error"
        with open(file_name, 'w') as fp:
            fp.write(html)
    return html


def onsocial(href):
    for e in ['facebook', 'twitter', 'google']:
        if e in href:
            return True
    return False


def same_tags(a, b):
    if len(a) != len(b):
        return False
    for i in range(len(a)):
        if a[i] != b[i]:
            print a[i], b[i]
            return False
    return True


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
        self.university_name = re.search('(\w+).edu', self.url).group(1)
        self.domain = '/'.join(directory_url.split("/")[:3])
        content, soup = self.open_page(directory_url)
        anchors = self.find_all_anchor(soup)
        index = self.find_example_index(anchors, example)
        # print directory_url, len(anchors[index:]), 

        # 第一个教授主页的作用主要在这里——如果能再来一个更好
        # 求共同祖先
        count, faculty_list = self.find_faculty_list(anchors[index:], directory_url)
        # print len(links)
        # assert count >= url_check[url]
        result = []
        for one in faculty_list:
            # print link
            result.append(self.dive_into_page(one))
        return result

    def load_key(self):
        with open('data/key.json') as fp:
            self.key_words = json.loads(fp.read(), strict=False)
        if self.key_words is None:
            return 'Error'

    def open_page(self, page_url):
        """

        """
        try:
            html = get_and_store_page(page_url)
            if html == "Error":
                return "Error", None
            soup = BeautifulSoup(html, 'html.parser')

            if soup.find("noframes"):
                for e in soup.find_all("frame"):
                    if contain_keys(e.get("src"), self.key_words["div_pass"]):
                        continue
                    page_url = '/'.join(page_url.split('/')[:-1] + [e.get("src")])
                    html = get_and_store_page(page_url)
                    soup = BeautifulSoup(html, 'html.parser')
            return html, soup
        except Exception, e:
            traceback.print_exc()
            print page_url, "error at open_page"
            return "Error", None

    def find_all_anchor(self, soup):
        """

        """
        l = soup.find_all('a')
        return l

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
        faculty_list = []
        # names = find_name_in_emails(l)
        # print names
        for e in l:
            if self.filter_list(e):
                continue

            href = e.get('href')
            faculty_link = format_url(href, self.domain)
            if faculty_link.startswith("Error"):
                print "Error!!!!!! at", href
                continue

            if faculty_link == faculty_url or faculty_link in links:
                continue
            links.append(faculty_link)
            e['href'] = faculty_link
            faculty_list.append(e)
            count += 1

            name = e.string
            if name is not None and (re.search('Website', name, re.I) or
                                     re.search('personal', name, re.I)):
                # print "personal website:", faculty_link
                pass
            else:
                # print "faculty page:", faculty_link
                pass
        return count, faculty_list

    def find_example_index(self, l, a):
        for i in l:
            href = i.get("href")
            if not href:
                continue
            page_url = format_url(href, self.domain)
        #   print page_url, a
            if page_url == a:
                return l.index(i)
        return -1

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
            if contain_keys(href, potential_name, True) and href not in faculty_url and not onsocial(
                    href):
                if href.startswith('mailto:'):
                    mail = href
                else:
                    faculty_page = href
        return faculty_page, mail

    def filter_research_interests(self, alist):
        """
        暂时只想到这么多条件
        """
        result = []
        for e in alist:
            if e.parent.name == 'a':
                continue
            if contain_keys(e, self.key_words['notresearch']):
                continue
            result.append(e)
        return result

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

    def get_research_interests(self, soup, content, tags):
        """
        
        """
        # 先用 完整的 research interests 找
        result = soup.find_all(string=re.compile("research\s+interest", re.I))
        # print len(result)
        if len(result) == 1:
            if len(re.sub("\s+", " ", result[0])) > 19:
                # print "by line"
                research_tags = self.extract_from_line(result[0], tags)
                if research_tags:
                    return research_tags
            node = result[0].parent
            tags = self.extract_from_sibling(node, tags)
            return tags
        elif len(result) > 1:
            for n in result:
                if len(n) > 19:
                    research_tags = self.extract_from_line(n, tags)
                    return research_tags
            
        # 再用 research or interests to find
        # then filter it by some rules
        result = soup.find_all(string=re.compile("(research|interests|focuses on|Expertise)", re.I))
        nodes = self.filter_research_interests(result)
        # print len(nodes)

        if len(nodes) == 1:
            # print nodes[0]
            if len(nodes[0]) > 19:
                # print "by line",
                research_tags = self.extract_from_line(result[0], tags)
                if research_tags:
                    return research_tags
            node = nodes[0].parent
            # print node.next_sibling
            tags = self.extract_from_sibling(node, tags)
            
            return tags
        elif len(nodes) > 1 and not len(tags):
            return [u"I'm so stupid to found it,我太蠢了找不到 %d" % len(nodes)]
        elif not len(tags):
            return [u"I'm so stupid to found it,我太蠢了找不到"]
        return tags

    def select_line_part(self, line):
        pos = 0
        for flag in self.key_words['interest_line_mode']:
            new_pos = line.find(flag)    
            if new_pos > pos:
                pos = new_pos + len(flag)
        return line[pos:]

    def replace_words(self, line):
        line = re.sub("\s+", " ", line)
        line = line.replace("(", "").replace(")", "")
        for x in self.key_words['replace']:
            line = re.sub(r'\b%s\b' % x, ',', line)
        return line

    def extract_from_line(self, line, tags):
        for sent in line.split('.'):
            if contain_keys(sent, self.key_words['interest_break'], True):
                break
            sent = self.select_line_part(re.sub("\s+", " ", re.sub("\n", ",", sent)))
            sent = self.replace_words(sent)
            # print sent
            for x in re.split("[,:;?]", sent):
                if x and x.strip():
                    tag = x.strip().lower()
                    if ' ' in tag and not contain_keys(tag, tags, True) and tag.count(' ') < 3:
                        tags.append(tag)

        return tags

    def extract_from_sibling(self, node, tags):
        # print node.name, node.string
        next_node = node.find_next_sibling()
        # print next_node
        if next_node and next_node.name == 'ul':
            tags = [e.strip().lower() for e in next_node.strings if e and e.strip()]
            return tags
        for n in node.find_next_siblings():
            if n.name != next_node.name:
                break
            # print n, n.text
            tags = self.extract_from_line(n.text, tags)
        return tags

    def get_open_position(self, soup, content):
        open_position = False
        open_term = ""
        text = soup.get_text()
        if contain_keys(text, self.key_words["open_position"], True):
            open_position = True
        if contain_keys(text, self.key_words["open_term"], True):
            open_term = "always"
        return open_position, open_term

    def dive_into_page(self, faculty_ele):
        faculty_link = faculty_ele.get("href")

        person = {'name': '', 'link': faculty_link, 'tags': None,
                'position': '', 'term': ''}
        if faculty_ele.string and contain_keys(faculty_link, faculty_ele.string.split(), True):
            person['name'] = faculty_ele.string

        content, soup = self.open_page(faculty_link)
        if content == 'Error':
            print "Error!!!!!! at the link", faculty_link
            return "Error in get", "Error in get", ["Error in get"]
        
        tags = self.get_research_interests(soup, content, [])
        # print tags
        
        anchors = self.find_all_anchor(soup)
        faculty_page, mail = self.get_personal_website(anchors, faculty_link)

        if faculty_page:
            # print 'page url: ',faculty_page
            faculty_page = format_url(faculty_page, self.domain)
            page_c, page_soup = self.open_page(faculty_page)
            if 'Error' == page_c or 'error' == page_c:
                print "Error!!!!!! at the page", faculty_page
            else:
                tags = self.get_research_interests(page_soup, page_c, tags)
                position, term = self.get_open_position(page_soup, page_c)
                person['position'] = position
                person['term'] = term

        if len(tags) > 1 and tags[0].startswith("I'm so stupid to"):
            tags = tags[1:]
        if len(tags) == 1 and tags[0].startswith("I'm so stupid to"):
            tags = []
        
        person['website'] = faculty_page
        person['mail'] = mail
        person['tags'] = tags

        return person


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

    import cProfile
    crawler = ResearchCrawler()
    for url in urls[1:2]:

        cProfile.run("crawler.crawl_from_directory(url, examples[urls.index(url)])", sort="cumulative")
        # print len(result)
        # print result[0]

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
