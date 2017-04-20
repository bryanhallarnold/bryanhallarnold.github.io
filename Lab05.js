var gl;
var shaderProgram;
var draw_type = 2;
var use_texture = 0;
var angle = 0;

// Set up the parameters for lighting
var intensity = 1;
var xPos = 0;
var yPos = 0;
var zPos = 0;
var light_ambient = [0 * intensity, 0 * intensity, 0 * intensity, 1];
var light_diffuse = [1 * intensity, 1 * intensity, 1 * intensity, 1];
var light_specular = [1 * intensity, 1 * intensity, 1 * intensity, 1];
var light_pos = [xPos, yPos, zPos, 1];  // Eye space position

var mat_ambient = [0, 0, 0, 1];
var mat_diffuse = [0, 0, 1, 1];
var mat_specular = [0.9, 0.9, 0.9, 1];
var mat_shine = [50];

//////////// Init OpenGL Context etc. ///////////////
function InitGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialize WebGL. Sorry :(");
    }
}

//////////////////// Cube Map ////////////////////////////
var cubemapTexture;

function InitCubeMap() {
    cubemapTexture = gl.createTexture();
    cubemapTexture.image = new Image();
    cubemapTexture.image.onload = function () { HandleCubemapTextureLoaded(cubemapTexture); }
    // cubemapTexture.image.src = "GoogleFace.png";
    cubemapTexture.image.src = "Space.jpg";
    // cubemapTexture.image.src = "brick.png";
    // cubemapTexture.image.src = "earth.png";
    console.log("loading cubemap texture...");
}

function HandleCubemapTextureLoaded(texture) {
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
}

//////////////////// Texture ////////////////////////////
var sampleTexture;

function InitTextures() {
    sampleTexture = gl.createTexture();
    sampleTexture.image = new Image();
    sampleTexture.image.onload = function () { HandleTextureLoaded(sampleTexture); }
    // sampleTexture.image.src = "brick.png";
    sampleTexture.image.src = "GoogleFace.png";
    // sampleTexture.image.src = "earth.png";
    console.log("loading texture...")
}

function HandleTextureLoaded(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

//////////////////// Initialize VBOs ////////////////////////
var teapotVertexPositionBuffer;
var teapotVertexNormalBuffer;
var teapotVertexTextureCoordBuffer;
var teapotVertexIndexBuffer;

var xMin, xMax, yMin, yMax, zMin, zMax;

function FindRange(positions) {
    xMin = xMax = positions[0];
    yMin = yMax = positions[1];
    zMin = zMax = positions[2];

    for (i = 0; i < positions.length / 3; i++) {
        if (positions[i * 3] < xMin) xMin = positions[i * 3];
        if (positions[i * 3] > xMax) xMax = positions[i * 3];

        if (positions[i * 3 + 1] < yMin) yMin = positions[i * 3 + 1];
        if (positions[i * 3 + 1] > yMax) yMax = positions[i * 3 + 1];

        if (positions[i * 3 + 2] < zMin) zMin = positions[i * 3 + 2];
        if (positions[i * 3 + 2] > zMax) zMax = positions[i * 3 + 2];
    }
    console.log("*****xMin = " + xMin + "; xMax = " + xMax);
    console.log("*****yMin = " + yMin + "; yMax = " + yMax);
    console.log("*****zMin = " + zMin + "; zMax = " + zMax);
}

///////////////// Initialize JSON Geometry File ///////////////////
function InitJSON() {
    var request = new XMLHttpRequest();
    request.open("GET", "teapot.json");
    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            console.log("state = " + request.readyState);
            HandleLoadedTeapot(JSON.parse(request.responseText));
        }
    }
    request.send();
}

function HandleLoadedTeapot(teapotData){
    console.log("in HandleLoadedTeapot");

    teapotVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(teapotData.vertexPositions),gl.STATIC_DRAW);
    teapotVertexPositionBuffer.itemSize = 3;
    teapotVertexPositionBuffer.numItems = teapotData.vertexPositions.length / 3;
    
    teapotVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotData.vertexNormals), gl.STATIC_DRAW);
    teapotVertexNormalBuffer.itemSize = 3;
    teapotVertexNormalBuffer.numItems = teapotData.vertexNormals.length / 3;

    teapotVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotData.vertexTextureCoords), gl.STATIC_DRAW);
    teapotVertexTextureCoordBuffer.itemSize=2;
    teapotVertexTextureCoordBuffer.numItems=teapotData.vertexTextureCoords.length / 2;

    teapotVertexIndexBuffer= gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(teapotData.indices), gl.STATIC_DRAW);
    teapotVertexIndexBuffer.itemSize = 1;
    teapotVertexIndexBuffer.numItems = teapotData.indices.length;

    FindRange(teapotData.vertexPositions);
    
    console.log("*****xMin = " + xMin + "; xMax = " + xMax);
    console.log("*****yMin = " + yMin + "; yMax = " + yMax);
    console.log("*****zMin = " + zMin + "; zMax = " + zMax);

    teapotVertexColorBuffer = teapotVertexNormalBuffer;

    DrawScene();
}

//////////////////// Create Matrices /////////////////////////////////
var mMatrix = mat4.create();  // Model matrix
var vMatrix = mat4.create();  // View matrix
var pMatrix = mat4.create();  // Projection matrix
var nMatrix = mat4.create();  // Normal matrix
var v2WMatrix = mat4.create();  // Eye space to world space matrix
var zAngle = 0.0;

/////////////////// Matrix Uniforms ////////////////////////////////
function SetMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mMatrixUniform, false, mMatrix);
    gl.uniformMatrix4fv(shaderProgram.vMatrixUniform, false, vMatrix);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.nMatrixUniform, false, nMatrix);
    gl.uniformMatrix4fv(shaderProgram.v2WMatrixUniform, false, v2WMatrix);
    gl.uniform1i(shaderProgram.use_textureUniform, use_texture);
}

//////////////////// Degree to Radians //////////////////////////////
function DegToRad(degrees) {
    return degrees * Math.PI / 180;
}

///////////////////// Draw Scene ///////////////////////////////
function DrawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (teapotVertexPositionBuffer == null || teapotVertexNormalBuffer == null || teapotVertexIndexBuffer == null) {
        return;
    }

    // Set up Projection matrix
    pMatrix = mat4.perspective(60, 1.0, 0.1, 100, pMatrix);

    // Set up View matrix ("multiply into the modelview matrix")
    vMatrix = mat4.lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0], vMatrix);

    // Set up the Model matrix
    mat4.identity(mMatrix);
    mMatrix = mat4.scale(mMatrix, [0.1, 0.1, 0.1]);
    angle = performance.now() / 1000 / 6 * 2 * Math.PI;
    mMatrix = mat4.rotate(mMatrix, angle, [0, 1, 0]);
    mMatrix = mat4.rotate(mMatrix, DegToRad(zAngle), [0, 0, 1]);
    
    // console.log('z angle = ' + zAngle);

    // Set up the Normal matrix
    mat4.identity(nMatrix);
    nMatrix = mat4.multiply(nMatrix, vMatrix);
    nMatrix = mat4.multiply(nMatrix, mMatrix);
    nMatrix = mat4.inverse(nMatrix);
    nMatrix = mat4.transpose(nMatrix);

    // Set up View (eye space) to World (world space) matrix
    mat4.identity(v2WMatrix);
    v2WMatrix = mat4.multiply(v2WMatrix, vMatrix);
    v2WMatrix = mat4.transpose(v2WMatrix);

    shaderProgram.light_posUniform = gl.getUniformLocation(shaderProgram, "light_pos");

    gl.uniform4f(shaderProgram.light_posUniform, light_pos[0], light_pos[1], light_pos[2], light_pos[3]);
    gl.uniform4f(shaderProgram.ambient_coefUniform, mat_ambient[0], mat_ambient[1], mat_ambient[2], 1.0);
    gl.uniform4f(shaderProgram.diffuse_coefUniform, mat_diffuse[0], mat_diffuse[1], mat_diffuse[2], 1.0);
    gl.uniform4f(shaderProgram.specular_coefUniform, mat_specular[0], mat_specular[1], mat_specular[2], 1.0);
    gl.uniform1f(shaderProgram.shininess_coefUniform, mat_shine[0]);

    gl.uniform4f(shaderProgram.light_ambientUniform, light_ambient[0], light_ambient[1], light_ambient[2], 1.0);
    gl.uniform4f(shaderProgram.light_diffuseUniform, light_diffuse[0], light_diffuse[1], light_diffuse[2], 1.0);
    gl.uniform4f(shaderProgram.light_specularUniform, light_specular[0], light_specular[1], light_specular[2], 1.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, teapotVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, teapotVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexTexCoordsAttribute, teapotVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexColorBuffer);  
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,teapotVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
    // Draw elementary arrays - triangle indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotVertexIndexBuffer);

    // Pass the Model, View, Projection, and Normal matrix to the shader
    SetMatrixUniforms();

    gl.activeTexture(gl.TEXTURE1);   // set texture unit 1 to use 
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);    // bind the texture object to the texture unit 
    gl.uniform1i(shaderProgram.cube_map_textureUniform, 1);   // pass the texture unit to the shader
    
    gl.activeTexture(gl.TEXTURE0);   // set texture unit 0 to use 
    gl.bindTexture(gl.TEXTURE_2D, sampleTexture);    // bind the texture object to the texture unit 
    gl.uniform1i(shaderProgram.textureUniform, 0);   // pass the texture unit to the shader

    
    if (draw_type == 1) gl.drawArrays(gl.LINE_LOOP, 0, teapotVertexPositionBuffer.numItems);	
    else if (draw_type == 0) gl.drawArrays(gl.POINTS, 0, teapotVertexPositionBuffer.numItems);
    else if (draw_type == 2) gl.drawElements(gl.TRIANGLES, teapotVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(DrawScene);
}


/////////////////////// Mouse Positions ////////////////////////////////////////
var lastMouseX = 0, lastMouseY = 0;

/////////////////////// Events /////////////////////////////////////////////
function OnDocumentMouseDown(event) {
    event.preventDefault();
    document.addEventListener('mousemove', OnDocumentMouseMove, false);
    document.addEventListener('mouseup', OnDocumentMouseUp, false);
    document.addEventListener('mouseout', OnDocumentMouseOut, false);
    var mouseX = event.clientX;
    var mouseY = event.clientY;

    lastMouseX = mouseX;
    lastMouseY = mouseY;
}

function OnDocumentMouseMove(event) {
    var mouseX = event.clientX;
    var mouseY = event.clientY;

    var diffX = mouseX - lastMouseX;
    var diffY = mouseY - lastMouseY;

    zAngle = zAngle + diffX / 5;
    
    lastMouseX = mouseX;
    lastMouseY = mouseY;

    DrawScene();
}

function OnDocumentMouseUp(event) {
    document.removeEventListener('mousemove', OnDocumentMouseMove, false);
    document.removeEventListener('mouseup', OnDocumentMouseUp, false);
    document.removeEventListener('mouseout', OnDocumentMouseOut, false);
}

function OnDocumentMouseOut(event) {
    document.removeEventListener('mousemove', OnDocumentMouseMove, false);
    document.removeEventListener('mouseup', OnDocumentMouseUp, false);
    document.removeEventListener('mouseout', OnDocumentMouseOut, false);
}

//////////////////////// WebGL Start ///////////////////////////
function WebGLStart() {
    var canvas = document.getElementById("lab05-canvas");
    InitGL(canvas);
    InitShaders();

    gl.enable(gl.DEPTH_TEST);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.vertexTexCoordsAttribute = gl.getAttribLocation(shaderProgram, "aVertexTexCoords");
    gl.enableVertexAttribArray(shaderProgram.vertexTexCoordsAttribute);

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.mMatrixUniform = gl.getUniformLocation(shaderProgram, "uMMatrix");
    shaderProgram.vMatrixUniform = gl.getUniformLocation(shaderProgram, "uVMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.v2WMatrixUniform = gl.getUniformLocation(shaderProgram, "uV2WMatrix");

    shaderProgram.light_posUniform = gl.getUniformLocation(shaderProgram, "light_pos");
    shaderProgram.ambient_coefUniform = gl.getUniformLocation(shaderProgram, "ambient_coef");
    shaderProgram.diffuse_coefUniform = gl.getUniformLocation(shaderProgram, "diffuse_coef");
    shaderProgram.specular_coefUniform = gl.getUniformLocation(shaderProgram, "specular_coef");
    shaderProgram.shininess_coefUniform = gl.getUniformLocation(shaderProgram, "mat_shininess");

    shaderProgram.light_ambientUniform = gl.getUniformLocation(shaderProgram, "light_ambient");
    shaderProgram.light_diffuseUniform = gl.getUniformLocation(shaderProgram, "light_diffuse");
    shaderProgram.light_specularUniform = gl.getUniformLocation(shaderProgram, "light_specular");

    shaderProgram.textureUniform = gl.getUniformLocation(shaderProgram, "myTexture");
    shaderProgram.cube_map_textureUniform = gl.getUniformLocation(shaderProgram, "cubeMap");
    shaderProgram.use_textureUniform = gl.getUniformLocation(shaderProgram, "use_texture");

    InitJSON();

    InitTextures();

    InitCubeMap();
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    console.log('start!');
    console.error('I hope there are no errors.');

    document.addEventListener('mousedown', OnDocumentMouseDown, false);
    DrawScene();
}

function BG(red, green, blue) {
    gl.clearColor(red, green, blue, 1.0);
    DrawScene();
}

function Reset() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    zAngle = 0;
    DrawScene();
}

function Geometry(type) {
    draw_type = type;
    DrawScene();
}

function IncreaseIntensity() {
    if (intensity < 1) {
        intensity = intensity + 0.05;
        light_ambient = [0 * intensity, 0 * intensity, 0 * intensity, 1];
        light_diffuse = [1 * intensity, 1 * intensity, 1 * intensity, 1];
        light_specular = [1 * intensity, 1 * intensity, 1 * intensity, 1];
        DrawScene();
    }
}

function DecreaseIntensity() {
    if (intensity > 0) {
        intensity = intensity - 0.05;
        light_ambient = [0 * intensity, 0 * intensity, 0 * intensity, 1];
        light_diffuse = [1 * intensity, 1 * intensity, 1 * intensity, 1];
        light_specular = [1 * intensity, 1 * intensity, 1 * intensity, 1];
        DrawScene();
        console.error('light_diffuse[0] = ' + light_diffuse[0]);
    }
}

function IncreaseLightXPosition() {
    //if (xPos < 1) {
        xPos = xPos + 1;
        light_pos = [xPos, yPos, zPos, 1];  // Eye space position
        DrawScene();
    //}
}

function DecreaseLightXPosition() {
    //if (xPos > -1) {
        xPos = xPos - 1;
        light_pos = [xPos, yPos, zPos, 1];  // Eye space position
        DrawScene();
    //}
}

function IncreaseLightYPosition() {
    //if (yPos < 1) {
        yPos = yPos + 1;
        light_pos = [xPos, yPos, zPos, 1];  // Eye space position
        DrawScene();
    //}
}

function DecreaseLightYPosition() {
    //if (yPos > -1) {
        yPos = yPos - 1;
        light_pos = [xPos, yPos, zPos, 1];  // Eye space position
        DrawScene();
    //}
}

function IncreaseLightZPosition() {
    //if (zPos < 100) {
        zPos = zPos + 1;
        light_pos = [xPos, yPos, zPos, 1];  // Eye space position
        DrawScene();
        console.error('zPos = ' + zPos);
    //}
}

function DecreaseLightZPosition() {
    //if (zPos > 0.1) {
        zPos = zPos - 1;
        light_pos = [xPos, yPos, zPos, 1];  // Eye space position
        DrawScene();
        console.error('zPos = ' + zPos);
    //}
}

function Texture(value) {
    use_texture = value;
    DrawScene();
}
