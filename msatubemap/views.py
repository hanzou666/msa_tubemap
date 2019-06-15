from msatubemap import api

class Browser():
    def on_get(self, req, resp):
        resp.html = api.template("index.html")


class GraphFromCustom():
    def on_post(self, req, resp):
        resp.media = {"hello": "hoge"}


class GraphFromEggNOG():
    def on_post(self, req, resp, nogname):
        resp.media = {"hoge": nogname}


api.add_route("/browser", Browser)
api.add_route("/graph/custom", GraphFromCustom)
api.add_route("/graph/eggnog/{nogname}", GraphFromEggNOG)
