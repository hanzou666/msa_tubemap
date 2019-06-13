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
    },
    methods: {
        tubemapHandler: function(submitType, event) {
            event.preventDefault();
            const method = "POST";
            const headers = {
                'Accept': 'application/json',
                'Content-type': 'application/json'
            };

            if (submitType === 0) {
                const body = JSON.stringify({ 'fasta': document.getElementById("textarea").value });
                fetch("/graph/custom", { method, headers, body })
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
            } else if (submitType === 2) {
                const nogname = document.getElementById("nogname").value;
                fetch("/graph/eggNOG/" + nogname, { method, headers})
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
            } else {
                console.log('Unknown submit')
                return 1
            }

           
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
