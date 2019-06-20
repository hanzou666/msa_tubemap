let app = new Vue({
    el: '#app',
    delimiters: ["[[", "]]"],
    data: {
        // svgID: "\#" + "svg",
        haplotypeColors: 'plainColors',
        haplotypeColorsList: ['plainColors', 'lightColors', 'greys', 'blues', 'reds'],
        // nodeWidth: 0
        isCompressed: false,
        nogname: null,
        fastaStr: ">spp.1\nATGCGTACTAGTAC\n>spp.2\nATGCGTA---GTAC\n>spp.3\nATGCCTACTAGTAC",
        loading: false,
        notFound: false,
        rendering: false,
    },
    watch: {
        haplotypeColors: function() {
            if (document.getElementById('svg').attributes.length != 1) {
                setColorSet('haplotypeColors', this.haplotypeColors);
            }
        },
        isCompressed: function() {
            if (document.getElementById('svg').attributes.length != 1) {
                setNodeWidthOption(this.isCompressed ? 2 : 0);
            }
        },
    },
    methods: {
        tubemapHandler: function(submitType, event) {
            event.preventDefault();
            d3.select('#svg').selectAll('*').remove();
            this.loading = true;
            this.notFound = false;
            const method = "POST";
            const headers = {
                'Accept': 'application/json',
                'Content-type': 'application/json'
            };
            let body;
            let url;
            if (submitType === 0) {
                body = JSON.stringify({ 'fasta': this.fastaStr });
                url = "/graph/custom";
            } else if (submitType === 2) {
                body = {}
                url = "/graph/eggnog/" + this.nogname;
            }

            fetch(url, { method, headers, body })
                .then(res => {
                    if (res.ok) {
                        this.loading = false;
                        return res.json();
                    } else {
                        this.loading = false;
                        this.notFound = true;
                        return Promise.reject(new Error(this.nogname + " not found."));
                    }
                })
                .then(function(myJson) {
                    if (Object.keys(myJson).length != 0) {
                        this.rendering = true;
                        create({
                            svgID: '#svg',
                            nodes: vgExtractNodes(myJson),
                            tracks: vgExtractTracks(myJson)
                        })
                        this.rendering = false;
                    }
                })
                .catch(console.error);
        },
    }
})
