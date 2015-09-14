requirejs.config({
    baseUrl: '.',
});

var glmatrix;
// Best practices in shader loading, courtesy of: http://stackoverflow.com/questions/5878703/webgl-is-there-an-alternative-to-embedding-shaders-in-html
// And: https://github.com/rhulha/WebGLAndRequireJSDemo
requirejs(['gl-matrix', 'text!Assignment1.FShader', 'text!Assignment1.VShader', 'webgl-debug'],
function (glmatrixLoaded, fragmentShaderRaw, vertexShaderRaw, webgldebug) {
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
        helloWorldTexture.image.src = "./HelloWorld.png"; 
}

var xrot = 0;
var yrot = 0;
var zrot = 0;
var xrot2 = 0;
var yrot2 = 0;
var zrot2 = 0;
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
    //create a world offset matrix for the current object
    glmatrix.mat4.identity(mvMatrix);
    xrot2 = Math.max(-maxMag, Math.min(maxMag, xrot2 + (Math.random() - 0.5) * maxInc)); xrot = xrot + xrot2;
    yrot2 = Math.max(-maxMag, Math.min(maxMag, yrot2 + (Math.random() - 0.5) * maxInc)); yrot = yrot + yrot2;
    zrot2 = Math.max(-maxMag, Math.min(maxMag, zrot2 + (Math.random() - 0.5) * maxInc)); zrot = zrot + zrot2;
    glmatrix.mat4.rotateX(mvMatrix, mvMatrix, xrot);
    glmatrix.mat4.rotateY(mvMatrix, mvMatrix, yrot);
    glmatrix.mat4.rotateZ(mvMatrix, mvMatrix, zrot);


    //define the object
    var size = 2  ;
    var vertices = [
    -1.0 * size, -1.0 * size, 0.0,
     1.0 * size, -1.0 * size, 0.0,
     1.0 * size, 1.0 * size, 0.0,
    -1.0 * size, 1.0 * size, 0.0,
    ];

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


    //draw the object
    var numItems = vertexIndices.length;

    var verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var vertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices), gl.STATIC_DRAW);

    var textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0); 
    gl.bindTexture(gl.TEXTURE_2D, helloWorldTexture); 
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, numItems, gl.UNSIGNED_SHORT, 0);



}



