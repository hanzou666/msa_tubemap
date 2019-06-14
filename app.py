#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from datetime import timedelta

import requests
# import requests_cache
from flask import Flask, render_template, request, jsonify

from api.msa2gfa import msa2gfa


class CustomFlask(Flask):
    jinja_options = Flask.jinja_options.copy()
    jinja_options.update(dict(
        block_start_string='(%',
        block_end_string='%)',
        variable_start_string='((',
        variable_end_string='))',
        comment_start_string='(#',
        comment_end_string='#)',
    ))


eggnog_url_syntax = 'http://eggnogapi.embl.de/nog_data/json/trimmed_alg/'

# requests_cache.install_cache(
    # cache_name='eggNOG', backend='sqlite', expire_after=timedelta(hours=1))

app = CustomFlask(__name__)


# Routing
@app.route('/')
def index():
    return "Hello, World!"


@app.route('/msa_tubemap', methods=['GET'])
def browse_tubemap():
    return render_template('index.html')


@app.route('/graph/custom', methods=['POST'])
def graph_from_custom_data():
    fasta_dic = parse_fasta_str(request.json['fasta'])
    return jsonify(mfa2graph(fasta_dic))


@app.route('/graph/eggNOG/<nogname>', methods=['POST'])
def graph_from_eggNOG_api(nogname):
    url = eggnog_url_syntax + nogname
    print(url)
    data = requests.get(url).json()
    fasta_dic = parse_fasta_str(data['raw_alg'])
    return jsonify(mfa2graph(fasta_dic))


def parse_fasta_str(fasta_str):
    fasta_dic = {}
    for tmpline in fasta_str.split('\n'):
        if len(tmpline) < 1:
            continue
        if tmpline[0] == '>':
            if (len(fasta_dic) > 100):
                return fasta_dic
            header = tmpline.rstrip().split()
            seq_name = header[0][1:]
            fasta_dic[seq_name] = ''
        else:
            fasta_dic[seq_name] += tmpline.rstrip()
    return fasta_dic


def mfa2graph(fasta_dic):
    if len(fasta_dic) == 0:
        return {}
    vg_like_graph, _ = msa2gfa.extract_graph(fasta_dic, 1)
    return vg_like_graph


if __name__ == '__main__':
    app.run()
