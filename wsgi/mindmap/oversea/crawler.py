# coding: utf-8

import os
import re
import json
import traceback

import requests
from bs4 import BeautifulSoup

from requests import ConnectionError, HTTPError

debug_level = 0

def contain_keys(href, keys, is_name=False):
    """

    """
    if not href or not keys:
        return False
    words = "(%s)" % '|'.join(e for e in keys)
    if is_name and re.search('%s' % words, href, re.I):
        return True
    if re.search(r'\b%s\b' % words, href, re.I):
        return True
    if re.search(r'_?%s_?' % words, href, re.I):
        return True
    return False


def format_url(href, domain, index=''):

    if href.startswith('http'):
        full_url = href
    elif href.startswith('//'):
        full_url = 'http:' + href
    elif href[0] == '/' and (len(href) == 1 or href[1] != '/'):
        full_url = domain + href
    elif href.find(domain) > -1:
        full_url = 'http://' + href
    else:
        full_url = index + href if index[-1] == '/' else index + '/' + href
    return full_url


def get_and_store_page(page_url):

    parts = page_url.split("/")[2].split(".")
    university_name = parts[-2]
    dir_name = os.path.join(os.environ.get('OPENSHIFT_PYTHON_LOG_DIR', '.'), 'data', university_name)
    if not os.path.isdir(dir_name):
        os.mkdir(dir_name)
    file_name = re.sub("[?%=]", "", dir_name+'/' + (page_url.split('/')[-1] if page_url[-1] != '/' else page_url.split('/')[-2]) + '.html')
    if os.path.isfile(file_name):
        with open(file_name) as fp:
            html = fp.read()
    else:
        try:
            r = requests.get(page_url)
            html = r.content
        except (ConnectionError, HTTPError), e:
            html = "Error at ", page_url

        with open(file_name, 'w') as fp:
            fp.write(html)
    return html


def onsocial(href):
    for e in ['facebook', 'twitter', 'google', 'youtube', 'calendar']:
        if e in href:
            return True
    return False


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

    def open_page(self, page_url):
        """

        """
        try:
            html = get_and_store_page(page_url)
            if html.startswith("Error at "):
                return "Error to load", None
            soup = BeautifulSoup(html, 'html.parser')

            if soup.find("frameset") and not soup.find("body"):
                frames = soup.find_all("frame")
                for e in frames[1:]:
                    if contain_keys(e.get("src"), self.key_words["div_pass"]):
                        continue
                    # if debug_level == 4: print(' ' * 2 * debug_level, "from frameset import ", e.get("src"))
                    page_url = page_url + e.get("src") if page_url[-1] == '/' else page_url + '/' + e.get("src") 
                    html = get_and_store_page(page_url)
                    soup = BeautifulSoup(html, 'html.parser')
            return html, soup
        except Exception, e:
            traceback.print_exc()
            return "Error to load", None

    def crawl_faculty_list(self, directory_url, example):
        self.example = example
        self.url = directory_url
        self.university_name = re.search('(\w+).edu', self.url).group(1)
        self.domain = '/'.join(directory_url.split("/")[:3])
        self.key_words['stop_word'] += re.findall("(\w+)", directory_url)
        
        content, soup = self.open_page(directory_url)
        anchors = self.find_all_anchor(soup, self.domain, directory_url)
        # print directory_url, len(anchors)
        index = self.find_example_index(anchors, example)
        # print directory_url, len(anchors[index:]), 

        # 第一个教授主页的作用主要在这里——如果能再来一个更好
        # 求共同祖先
        count, faculty_list = self.find_faculty_list(anchors[index:], directory_url)
        return count, faculty_list
    
    def crawl_from_directory(self, directory_url, example, name):
        """
        从目录爬
        """

        count, faculty_list = self.crawl_faculty_list(directory_url, example)
        # assert count >= url_check[url]
        result = []
        for one in faculty_list:
            person = self.dive_into_page(one)
            result.append(person)
        return result

    def load_key(self):
        with open(os.path.join(os.path.dirname(__file__), 'key.json')) as fp:
            self.key_words = json.loads(fp.read(), strict=False)
        if self.key_words is None:
            return 'Error'

    def find_all_anchor(self, soup, domain, page_url):
        """

        """
        l = soup.find_all('a')
        return l

    def filter_list(self, e):
        name = e.string
        href = e.get('href')
        base_faculty_filter = [e for e in self.example.split('/')
                               if e and not e.startswith('http') and not e.endswith('.edu')]

        if name and "&" in name:
            return False
        if href and '~' in href:
            return False
        elif name is not None and contain_keys(name, self.key_words['site_flag']):
            return False
        elif href and href.startswith('mailto:'):
            return True
        elif not href or len(href) < 5 or base_faculty_filter[0] not in href:
            return True
        elif contain_keys(href, self.key_words['notprof']):
            return True
        elif not contain_keys(href, self.key_words['keys']):
            return True
        return False

    def get_personal_website(self, l, page_url):
        potential_name = re.findall(r"([A-Z]?[a-z]+)", page_url) + ['personal']

        potential_name = [e for e in potential_name if not contain_keys(e, self.key_words['keys'] + self.key_words[
            'stop_word'] + self.key_words['notprof'] + ['people', self.university_name])]
        # if debug_level == 1: print('potential name: ' + str(potential_name))

        faculty_page = ''
        mail = ''

        for a in l:
            href = a.get('href')
            
            if not href or len(href) < 5:
                continue
                
            suffix = href.split('.')[-1]
            
            if len(suffix) < 5 and contain_keys(suffix, self.key_words['skip_file']):
                continue
            # if debug_level == 1: print(' ' * 2 * debug_level + ' search href: ' + href)
            
            if not faculty_page and href not in page_url and\
                    not onsocial(href) and (contain_keys(href, potential_name,
                        True) or contain_keys(a.string, potential_name, True)):
                # if debug_level == 1: print(' ' * 2 * debug_level + ' search it ok : ' + href)
                if href.startswith('mailto:'):
                    mail = href
                else:
                    faculty_page = href

        # if debug_level == 1: print(' ' * 2 * debug_level + ' final link: ' + faculty_page)
        return faculty_page, mail

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
                # print "Error!!!!!! at", href
                continue

            if faculty_link == faculty_url:
                continue

            if faculty_link in links:
                name = e.get_text()
                # print name
                i = links.index(faculty_link)
                if name and not faculty_list[i].string:
                    e['href'] = faculty_link
                    faculty_list[i] = e
                continue
            links.append(faculty_link)
            e['href'] = faculty_link
            faculty_list.append(e)
            count += 1
        return count, faculty_list

    def find_example_index(self, l, a):
        for i in range(len(l)):
            href = l[i].get("href")
            if not href:
                continue
            href = format_url(l[i].get("href"), self.domain, a)
        #   print page_url, a
            if href == a:
                return i
        return -1

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

    def get_open_position(self, soup, content):
        open_position = False
        open_term = ""
        text = soup.get_text()
        # if debug_level == 5: print(" " * 2 * debug_level + text)
        if contain_keys(text, self.key_words["open_position"], True):
            open_position = True
        if contain_keys(text, self.key_words["open_term"], True):
            open_term = "always"
        return open_position, open_term

    def extract_from_line(self, line, tags):
        pref = self.key_words['prefix_major']
        for sent in line.split('.'):
            if contain_keys(sent, self.key_words['interest_break'], True):
                break
            sent = self.select_line_part(re.sub("\s+", " ", sent))
            sent = self.replace_words(sent)
            for x in re.split("[,:;?]", sent):
                if not x or not x.strip():
                    continue
                tag = x.strip().lower()
                and_tags = [e.strip() for e in tag.replace("and", ",").split(",")]
                for i in range(1, len(and_tags)):
                    if and_tags[i] and and_tags[i-1] and ' ' not in\
                            and_tags[i-1] and (len(and_tags[i-1]) < 9 or and_tags[i-1].endswith('al')):
                        and_tags[i-1] = "%s and %s" % (and_tags[i-1], and_tags[i])
                and_tags = sorted(and_tags)
                # if debug_level == 3: print ' ' * 2 * 3, tag, and_tags
                for i in range(len(and_tags)):
                    tag = and_tags[i]
                    if tag.count(' ') >= 4:
                        continue
                    if len(tag) > 45:
                        continue
                    if contain_keys(tag, tags, True):
                        continue

                    if (' ' in tag or contain_keys(tag, pref, True)):
                        tags.append(tag)

        return tags
    
    def extract_from_sibling(self, node, tags):

        while not node.next_sibling:
            node = node.parent

        next_node = node.find_next_sibling()
        if next_node and next_node.name == 'ul':
            for e in next_node.strings:
                if e and e.strip():
                    tags = self.extract_from_line(e.strip(), tags)
            return tags

        if next_node and next_node.name != 'br' and next_node.string:
            tags = self.extract_from_line(next_node.string, tags)

        if not tags:
            node = node.parent
            text = self.select_line_part(re.sub("\n", ".", node.get_text()))
            # print "      find from text  ", text
            tags = self.extract_from_line(text, tags)
        return tags

    def get_research_interests(self, soup, content, tags, website):
        """
        
        """
        # 先用 完整的 research interests 找
        result = soup.find_all(string=re.compile("research\s+interest", re.I))
        # if debug_level >= 2: print(' ' * 2 * debug_level+ "research interest has %d at %s" % (len(result), website))
        if len(result) == 1:
            if len(result[0]) > result[0].lower().find("interest") + 15:
                line = self.select_line_part(re.sub("\n", ".", result[0]))
                # if debug_level == 3: print (' ' * 2 * debug_level + " from the line " + line)
                research_tags = self.extract_from_line(line, tags)
                
                if research_tags:
                    # if debug_level == 3: print(' ' * 2 * debug_level, "extract from line %d  ge " % len(research_tags))
                    return research_tags
            node = result[0]
            tags = self.extract_from_sibling(node, tags)
            # print(" extract from sibling %d  ge " % len(tags))
            return tags
        elif len(result) > 1:
            # 多个的情况太复杂，不处理了
            for node in result:
                if node.parent.name == 'a':
                    continue
                if len(node) > 30:
                    node = self.select_line_part(re.sub("\n", ".", node))
                    # if debug_level == 3:  print(" extract from line %s " % node)
                    tags = self.extract_from_line(node, tags)
                    # if debug_level == 3:  print(" extract from line %d  ge " % len(tags))
                    return tags
                tags = self.extract_from_sibling(node, tags)
                # if debug_level == 3: print(' ' * 2 * debug_level, "extract from sibling %d  ge " % len(tags), tags)
                return tags
            
        # 再用 research or interests to find
        # then filter it by some rules
        result = soup.find_all(string=re.compile("(research|focuses on|Expertise)", re.I))
        nodes = self.filter_research_interests(result)
        # if debug_level == 3: print(' ' * 2 * debug_level, "only one has %d at %s " % (len(nodes), website))
        # print tags

        if len(nodes) == 1:
            # print nodes[0]
            if len(nodes[0]) > 35:
                # print "by line",
                research_tags = self.extract_from_line(nodes[0], tags)
                if research_tags:
                    return research_tags

            # if debug_level == 3: print(' ' * 2 * debug_level + "need to sibling")
            tags = self.extract_from_sibling(nodes[0], tags)
            return tags
        elif len(nodes) < 4:
            if website == '': 
                for node in nodes:
                    if node.parent.name == "a":
                        continue
                    if len(node) > 25:
                        continue
                    tags = self.extract_from_sibling(node, tags)
            elif website:
                for node in nodes:
                    if node.parent.name != "a":
                        continue
                    research_link = format_url(node.parent.get("href"),
                                               self.domain, website)
                    if research_link == website:
                        continue
                    re_content, re_soup = self.open_page(research_link)
                    tags = self.get_research_interests(re_soup, re_content,
                                                       tags, research_link)


        
        if not len(tags):
            return [u"I'm so stupid to found it,我太蠢了找不到"]
        return tags
    
    def dive_into_page(self, faculty_ele):
        faculty_link = faculty_ele.get("href")
        person = {'name': '', 'link': faculty_link, 'tags': None,
                'position': False, 'term': ''}
        # 搞名字
        name = faculty_ele.get_text()
        if name and not contain_keys(name, self.key_words['site_flag']):
            person['name'] = name
        if not person['name']:
            # if debug_level == 1: print(' link is ' + faculty_link)
            name = faculty_link.split('/')[-1] if faculty_link.strip()[-1] != '/' else faculty_link.split('/')[-2]
            # if debug_level == 1: print(' link the name is ' + name)
            person['name'] = ' '.join(e.capitalize() for e in re.findall('(\w+)', name) if not contain_keys(e, self.key_words['notname']))
        # if debug_level == 1: print(' name is ' + person['name'])

        if contain_keys(faculty_link.split('/')[-1], self.key_words['skip_file']):
            return person

        content, soup = self.open_page(faculty_link)
        if content.startswith('Error to load'):
            # print "Error!!!!!! at the link", faculty_link
            return person

        tags = self.get_research_interests(soup, content, [], "")
        position, term = self.get_open_position(soup, content)
        person['position'] = position
        person['term'] = term
        # if debug_level > 1: print("find tags %d ge " % len(tags) + str(tags))
        # print tags
        
        anchors = self.find_all_anchor(soup, self.domain, faculty_link)
        faculty_page, mail = self.get_personal_website(anchors, faculty_link)

        if faculty_page:
            # if debug_level == 1: print 'website page url: ',faculty_page
            faculty_page = format_url(faculty_page, self.domain, faculty_link)
            page_c, page_soup = self.open_page(faculty_page)
            if page_c.startswith('Error to load'):
                # print "Error!!!!!! at the page", faculty_page
                pass
            else:
                tags = self.get_research_interests(page_soup, page_c, tags,
                                                   faculty_page)
                position, term = self.get_open_position(page_soup, page_c)
                if position:
                    person['position'] = position
                if term:
                    person['term'] = term

        if len(tags) > 1 and tags[0].startswith("I'm so stupid to"):
            tags = tags[1:]
        if len(tags) == 1 and tags[0].startswith("I'm so stupid to"):
            tags = []
        
        person['website'] = faculty_page
        person['mail'] = mail
        person['tags'] = tags
        if not person['name'] and mail.startswith("mailto:"):
            person['name'] = mail[mail.find(':')+1: mail.find('@')].capitalize()

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
        print url

        cProfile.run("crawler.crawl_from_directory(url, examples[urls.index(url)])", "my_prof")

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
