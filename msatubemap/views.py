from msatubemap import api, graph_processing

class Browser():
    def on_get(self, req, resp):
        resp.html = api.template("index.html")


class GraphFromCustom():
    async def on_post(self, req, resp):
        data = await req.media()
        resp.media = graph_processing.get_graph(data['fasta'])


class GraphFromEggNOG():
    def on_post(self, req, resp, nogname):
        resp.media = {"hoge": nogname}


api.add_route("/browser", Browser)
api.add_route("/graph/custom", GraphFromCustom)
api.add_route("/graph/eggnog/{nogname}", GraphFromEggNOG)
