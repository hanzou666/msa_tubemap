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
        // svgID: '#svg'
    },
    methods: {
        tubemapHandler: function(submitType, event) {
            event.preventDefault();
            const method = "POST";
            let body;
            if (submitType === 0){
                body = JSON.stringify({ 'fasta': document.getElementById("textarea").value, 'type': "paste" })
            } else if (submitType === 1){
                console.log(submitType)
            } else if (submitType === 2) {
                body = JSON.stringify({ 'fasta': null, 'type': 'demo' })
            } else {
                console.log('Unknown submit')
                return 1
            }
            const headers = {
                'Accept': 'application/json',
                'Content-type': 'application/json'
            };
            fetch("/output_graph", { method, headers, body })
                .then((res) => res.json())
                .then(function (myJson) {
                    if (Object.keys(myJson).length != 0){
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
            // console.log('hc=%s, ac=%s', this.haplotypeColors, color);
            setColorSet('haplotypeColors', color);
            // console.log('hc=%s, ac=%s', this.haplotypeColors, color);
        }
    }
})
