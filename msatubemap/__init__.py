import responder

api = responder.API(
    templates_dir="msatubemap/templates",
    static_dir='msatubemap/static'
)

import msatubemap.views
