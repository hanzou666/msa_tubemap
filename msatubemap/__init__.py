import responder

api = responder.API(
    templates_dir="msatubemap/templates",
    static_dir='msatubemap/static'
)

MAX_HAPLOTYPE = 50

import msatubemap.views
