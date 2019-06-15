import responder

api = responder.API()


@api.route("/")
async def hello(req, resp):
    resp.text = "hello, world!"

if __name__ == "__main__":
    api.run()
