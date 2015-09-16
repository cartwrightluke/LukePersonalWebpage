requirejs.config({
    baseUrl: '.',
    paths: {
        scripts: '../scripts',
        resources: './resources'
    }
});

var glmatrix;
// Best practices in shader loading, courtesy of: http://stackoverflow.com/questions/5878703/webgl-is-there-an-alternative-to-embedding-shaders-in-html
// And: https://github.com/rhulha/WebGLAndRequireJSDemo
requirejs(['scripts/gl-matrix', 'scripts/text!resources/Assignment2.FShader', 'scripts/text!resources/Assignment2.VShader', 'scripts/webgl-debug', 'scripts/delaunay', 'scripts/ammo'],
function (glmatrixLoaded, fragmentShaderRaw, vertexShaderRaw, webgldebug, tri, ammo) {
    glmatrix = glmatrixLoaded;

    //initialise matrices
    mvMatrix = glmatrix.mat4.create();
    pMatrix = glmatrix.mat4.create();

    //get the gl context
    var canvas = document.getElementById("webGLCanvas");
    initGL(canvas);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    //prepare gl context for debugging
    gl = WebGLDebugUtils.makeDebugContext(gl, 
        //Error logging function
        function (err, funcName, args) {
            throw WebGLDebugUtils.glEnumToString(err) + ": " + funcName;
        }, 
        //webGL call logging function
        function logGLCall(functionName, args) {
            console.log("gl." + functionName + "(" +
            WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
        }
    );

    //Prepare the shaders
    initShaders(fragmentShaderRaw, vertexShaderRaw);
    prepareScene();
    setInterval(drawScene, 100);
    

});


//Open GL initialization
var gl;
function initGL(canvas) {
    // Best practice webGL initialization, see: http://stackoverflow.com/questions/22751313/what-is-the-difference-between-getcontextwebgl-vs-getcontext3d
    if (!window.WebGLRenderingContext) {
        window.alert("This website requires webGL to render correctly, and no fallback is available. Please upgrade your browser.");
        // the browser doesn't even know what WebGL is
        window.location = "http://get.webgl.org";
    } else {
        var canvas = document.getElementById("webGLCanvas");
        canvas.addEventListener("mousedown", onScreenClick, false);
        gl = canvas.getContext("webgl", {
            premultipliedAlpha: false,  // Ask non-premultiplied alpha
            alpha: false
        });
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
        if (!gl) {
            window.alert("This website requires webGL to render correctly, and no fallback is available. Please follow the troubleshoot your webGL installation.");
            // browser supports WebGL but initialization failed.
            window.location = "http://get.webgl.org/troubleshooting";
        }
    }
}


function onScreenClick(event) {
    var x = new Number();
    var y = new Number();
    var canvas = document.getElementById("webGLCanvas");

    if (event.x != undefined && event.y != undefined) {
        x = event.x;
        y = event.y;
    }
    else // Firefox method to get the position
    {
        x = event.clientX + document.body.scrollLeft +
            document.documentElement.scrollLeft;
        y = event.clientY + document.body.scrollTop +
            document.documentElement.scrollTop;
    }

    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;

    xc = canvas.clientWidth / 2;
    yc = canvas.clientHeight / 2;

    rect = [vertices[0], vertices[1], vertices[2], 1,
                                vertices[3], vertices[4], vertices[5], 1,
                                vertices[6], vertices[7], vertices[8], 1,
                                vertices[9], vertices[10], vertices[11], 1];
    glmatrix.mat4.ortho(pMatrix, -6, 6, -6, 6, -20, 30);

    glmatrix.mat4.multiply(rect, pMatrix, rect);
    

    if ((x > rect[0] * xc + xc) && (x < rect[8 + 0] * xc + xc) && (y > rect[1] * yc + yc) && (y < rect[8 + 1] * yc + yc)) {
        xProp = (x - (rect[0 + 0] * xc + xc)) / ((rect[8 + 0] - rect[0 + 0]) * xc);
        yProp = (y - (rect[0 + 1] * yc + yc)) / ((rect[8 + 1] - rect[0 + 1]) * yc);

        split(xProp, 1- yProp)
    }


}

function split(xProp, yProp) {
    toTriangulate[toTriangulate.length] = [xProp * size * 2 - size, yProp * size * 2 - size];
    vertices = vertices.concat([xProp * size * 2 - size, yProp * size * 2 - size, 0.0]);
    textureCoords = textureCoords.concat(xProp, yProp);
    vertexIndices = Delaunay.triangulate(toTriangulate);
    spinning = true;
}

var shaderProgram;

function initShaders(fragmentShaderRaw, vertexShaderRaw) {
    shaderProgram = gl.createProgram();

    //Compile and load the vertex shader
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderRaw);
    gl.compileShader(vertexShader);
    gl.attachShader(shaderProgram, vertexShader);
    
    //Compile and load the fragment shader
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderRaw);
    gl.compileShader(fragmentShader);
    gl.attachShader(shaderProgram, fragmentShader);

    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    //Enable the vertex position attributes
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);


    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    //Enable the world view projection matrix
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");

    //Enable the world position offset matrix
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");


    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

//Recalculate the matrices before each draw
var mvMatrix;
var pMatrix;
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}



var helloWorldTexture;
function prepareScene() {
        helloWorldTexture = gl.createTexture(); 
        helloWorldTexture.image = new Image(); 
        helloWorldTexture.ready = false; 
        helloWorldTexture.image.onload = function () { 
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); 
            gl.bindTexture(gl.TEXTURE_2D, helloWorldTexture); 
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Only want to display hello world once
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, helloWorldTexture.image);
            gl.bindTexture(gl.TEXTURE_2D, null); 
            helloWorldTexture.ready = true; 
        }    
        helloWorldTexture.image.src = "./resources/HelloWorld.png"; 
}



//define the object
var size = 2  ;
var vertices = [
-1.0 * size, -1.0 * size, 0.0,
 1.0 * size, -1.0 * size, 0.0,
 1.0 * size, 1.0 * size, 0.0,
-1.0 * size, 1.0 * size, 0.0,
];

var toTriangulate = [
 [-1.0 * size, -1.0 * size],
 [1.0 * size, -1.0 * size],
 [1.0 * size, 1.0 * size],
 [-1.0 * size, 1.0 * size]
]

var textureCoords = [
  0.0, 0.0,
  1.0, 0.0,
  1.0, 1.0,
  0.0, 1.0,
];

var vertexIndices = [
   0, 1, 2,
   0, 2, 3
];

var spinning = false;
function spin(i) {
    index = i.toString();
    if (!xrot.hasOwnProperty(index)) {
        xrot[index] = 0; xrot2[index] = 0;
        yrot[index] = 0; yrot2[index] = 0;
        zrot[index] = 0; zrot2[index] = 0;
    }
    if (spinning) {
        xrot2[index] = Math.max(-maxMag, Math.min(maxMag, xrot2[index] + (Math.random() - 0.5) * maxInc)); xrot[index] = xrot[index] + xrot2[index];
        yrot2[index] = Math.max(-maxMag, Math.min(maxMag, yrot2[index] + (Math.random() - 0.5) * maxInc)); yrot[index] = yrot[index] + yrot2[index];
        zrot2[index] = Math.max(-maxMag, Math.min(maxMag, zrot2[index] + (Math.random() - 0.5) * maxInc)); zrot[index] = zrot[index] + zrot2[index];
    }
    return [xrot[index], yrot[index], zrot[index]]
}

var xrot = new Object();
var yrot = new Object();
var zrot = new Object();
var xrot2 = new Object();
var yrot2 = new Object();
var zrot2 = new Object();
var maxMag = 0.2;
var maxInc = 0.04;

function drawScene() {
    if (helloWorldTexture.ready != true) return;

    //Prepare a colored viewport for drawing on
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clearColor(1.0, 1.0, 1.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    //Create a projection matrix for the current viewpoint
    glmatrix.mat4.perspective(pMatrix, 0.8, gl.viewportWidth / gl.viewportHeight, 0.1, 10.0);
    glmatrix.mat4.ortho(pMatrix,-6, 6, -6, 6, -20, 30);

    for (var i = 0; i < vertexIndices.length; i = i + 3) {
        var spinAxis = spin(i/3);

        //create a world offset matrix for the current object
        glmatrix.mat4.identity(mvMatrix);
        glmatrix.mat4.rotateX(mvMatrix, mvMatrix, spinAxis[0]);
        glmatrix.mat4.rotateY(mvMatrix, mvMatrix, spinAxis[1]);
        glmatrix.mat4.rotateZ(mvMatrix, mvMatrix, spinAxis[2]);

        var v1i = vertexIndices[i];
        var v2i = vertexIndices[i + 1];
        var v3i = vertexIndices[i + 2];

        var verticesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);

        var v1 = vertices.slice(v1i * 3, v1i *3 + 3);
        var v2 = vertices.slice(v2i * 3, v2i *3 + 3);
        var v3 = vertices.slice(v3i * 3, v3i *3 + 3);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v1.concat(v2, v3)), gl.STATIC_DRAW);
        
        var vertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2]), gl.STATIC_DRAW);

        var textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        var t1 = textureCoords.slice(v1i * 2, v1i *2 + 2);
        var t2 = textureCoords.slice(v2i * 2, v2i *2 + 2);
        var t3 = textureCoords.slice(v3i * 2, v3i *2 + 2);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(t1.concat(t2,t3)), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, helloWorldTexture);
        gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
        setMatrixUniforms();
        gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, 0);

    }



    


}



