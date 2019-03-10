#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Flask, render_template, request, jsonify
from werkzeug import secure_filename
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

app = CustomFlask(__name__)

# Routing
@app.route('/')
def index():
    return "Hello, World!"


@app.route('/browse_tubemap', methods=['GET'])
def browse_tubemap():
    return render_template('index.html')


@app.route('/output_graph', methods=['POST'])
def output_graph():
    fasta_dic = {}
    if request.json['type'] == 'paste':
        vg_like_graph = parse_paste(request.json['fasta'])
    elif request.json['type'] == 'demo':
        vg_like_graph = parse_demo_data()
    return jsonify(vg_like_graph)


def parse_paste(fasta_str):
    fasta_dic = {}
    for tmpline in fasta_str.split('\n'):
        if len(tmpline) < 1:
            continue
        if tmpline[0] == '>':
            header = tmpline.rstrip().split()
            seq_name = header[0][1:]
            fasta_dic[seq_name] = ''
        else:
            fasta_dic[seq_name] += tmpline.rstrip()
    if fasta_dic == {}:
        return {}
    vg_like_graph, _ = msa2gfa.extract_graph(fasta_dic, 1)
    return vg_like_graph


def parse_demo_data():
    fasta_dic = msa2gfa.parse_fasta('./demo_data/toy_data/msa.fa')
    vg_like_graph, _ = msa2gfa.extract_graph(fasta_dic, 1)
    return vg_like_graph


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
