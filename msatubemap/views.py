from msatubemap import api

@api.route("/")
async def hello(req, resp):
    resp.text = "hello, world!"


@api.route("/{name}")
async def hoge(rep, resp, name):
    resp.text = f"Welcome {name}!"
