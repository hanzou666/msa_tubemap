let app = new Vue({
    el: '#app',
    delimiters: ["[[", "]]"],
    data: {
        // svgID: "\#" + "svg",
        nodes: null,
        tracks: null,
        reads: null,
        haplotypeColors: 'plainColors',
        tmpColor: null,
        haplotypeColorsList: ['plainColors', 'lightColors', 'greys', 'blues', 'reds'],
        // nodeWidth: 0
        isCompressed: false,
        nogname: null,
    },
    methods: {
        tubemapHandler: function(submitType, event) {
            event.preventDefault();
            const method = "POST";
            const headers = {
                'Accept': 'application/json',
                'Content-type': 'application/json'
            };
            let body;
            let url;
            if (submitType === 0) {
                body = JSON.stringify({ 'fasta': document.getElementById("textarea").value });
                url = "/graph/custom";
            } else if (submitType === 2) {
                body = {}
                console.log
                url = "/graph/eggNOG/" + this.nogname;
            }

            fetch(url, { method, headers, body })
                .then((res) => res.json())
                .then(function (myJson) {
                    if (Object.keys(myJson).length != 0) {
                        this.nodes = vgExtractNodes(myJson);
                        this.tracks = vgExtractTracks(myJson);
                        // this.reads = vgExtractReads(this.nodes, this.tracks, []);
                        create({
                            svgID: '#svg',
                            nodes: this.nodes,
                            tracks: this.tracks
                        })
                    }
                })
                .catch(console.error);
        },
        compressNodes: function(){
            // this.isCompressed = !this.isCompressed
            setNodeWidthOption(this.isCompressed ? 2 : 0);
        },
        changeColor: function(color) {
            setColorSet('haplotypeColors', color);
        }
    }
})
