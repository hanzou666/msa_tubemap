import requests

from msatubemap import api, graph_processing, dfam_service


class Browser():
    def on_get(self, req, resp):
        resp.html = api.template("index.html")


class GraphFromCustom():
    async def on_post(self, req, resp):
        data = await req.media()
        resp.media = graph_processing.get_graph(data['fasta'])


class GraphFromEggNOG():
    def __init__(self):
        self.eggnog_url_syntax = 'http://eggnogapi.embl.de/nog_data/json/trimmed_alg'

    def on_post(self, req, resp, nogname):
        url = self.construct_url(nogname)
        data = requests.get(url)
        if data.status_code == 200 and 'raw_alg' in data.json().keys():
            resp.media = graph_processing.get_graph(data.json()['raw_alg'])
        else:
            resp.status_code = 404

    def construct_url(self, nogname):
        return self.eggnog_url_syntax + '/' + nogname


class DfamSearch():
    def on_get(self, req, resp):
        if req.params.get('s') is None and req.params.get('w') is None:
            resp.status_code = 404
        else:
            resp.media = dfam_service.get(req.params.get('s'), req.params.get('w')).to_dict()


api.add_route("/msatubemap", Browser, static=True)
api.add_route("/graph/custom", GraphFromCustom)
api.add_route("/graph/eggnog/{nogname}", GraphFromEggNOG)
api.add_route("/api/search/dfam", DfamSearch)
