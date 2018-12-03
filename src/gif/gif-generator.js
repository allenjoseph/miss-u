import gifWriter from '../dependencies/gifWriter';

export default function generateGif(frames) {
    const buffer = [];
    const width = frames[0].width;
    const height = frames[0].height;
    const gifOptions = {
        loop: 0
    };

    const gw = new gifWriter(buffer, width, height, gifOptions);

    frames.sort((a, b) => a.position - b.position);
    frames.forEach(frame => {
        gw.addFrame(0, 0, width, height, frame.pixels, {
            palette: frame.palette,
            delay: 10
        });
    });

    gw.end();

    return 'data:image/gif;base64,' + btoa(bufferToString(buffer));
}

function bufferToString(buffer) {
    const numberValues = buffer.length;
    let str = '';
    let x = -1;
    const byteMap = function () {
        const byteMap = [];
        for (let i = 0; i < 256; i++) {
            byteMap[i] = String.fromCharCode(i);
        }
        return byteMap;
    }();
    while (++x < numberValues) {
        str += byteMap[buffer[x]];
    }
    return str;
}