/*{
	"DESCRIPTION": "performs a 3d rotation",
	"CREDIT": "by zoidberg (fixed & completed)",
	"ISFVSN": "2",
	"CATEGORIES": [
		"Geometry Adjustment", "Utility"
	],
	"INPUTS": [
		{
			"NAME": "inputImage",
			"TYPE": "image"
		},
		{
			"NAME": "xrot",
			"LABEL": "X rotate",
			"TYPE": "float",
			"MIN": 0.0,
			"MAX": 6.28318,
			"DEFAULT": 0.0
		},
		{
			"NAME": "yrot",
			"LABEL": "Y rotate",
			"TYPE": "float",
			"MIN": 0.0,
			"MAX": 6.28318,
			"DEFAULT": 0.0
		},
		{
			"NAME": "zrot",
			"LABEL": "Z rotate",
			"TYPE": "float",
			"MIN": 0.0,
			"MAX": 6.28318,
			"DEFAULT": 0.0
		},
		{
			"NAME": "zoom",
			"LABEL": "Zoom Level",
			"TYPE": "float",
			"MIN": 0.1,
			"MAX": 2.0,
			"DEFAULT": 1.0
		}
	]
}*/

void main()
{
	// 1. Normalisasi koordinat tekstur ke rentang -0.5 sampai 0.5 (pusat di tengah)
	vec2 uv = isf_FragNormCoord - vec2(0.5);
	
	// Sesuaikan aspek rasio agar rotasi tidak terlihat gepeng/terdistorsi
	float aspect = RENDERSIZE.x / RENDERSIZE.y;
	uv.x *= aspect;

	// 2. Siapkan koordinat 3D tiruan (Sinar dari kamera menembus bidang Z)
	// Nilai zoom memengaruhi seberapa dekat kamera dengan bidang 3D
	vec3 ray = vec3(uv, zoom); 

	// 3. Hitung Sinus dan Kosinus untuk masing-masing sumbu rotasi
	float cx = cos(xrot), sx = sin(xrot);
	float cy = cos(yrot), sy = sin(yrot);
	float cz = cos(zrot), sz = sin(zrot);

	// 4. Aplikasikan Rotasi 3D pada ray (vektor 3D)
	// Rotasi X
	ray = vec3(ray.x, ray.y * cx - ray.z * sx, ray.y * sx + ray.z * cx);
	// Rotasi Y
	ray = vec3(ray.x * cy + ray.z * sy, ray.y, -ray.x * sy + ray.z * cy);
	// Rotasi Z
	ray = vec3(ray.x * cz - ray.y * sz, ray.x * sz + ray.y * cz, ray.z);

	// 5. Proyeksi Perspektif 3D kembali ke bidang 2D
	// Kita membagi X dan Y dengan Z untuk menciptakan efek kedalaman (depth perspective)
	vec2 rotatedUV = ray.xy / ray.z;

	// Kembalikan perbaikan aspek rasio
	rotatedUV.x /= aspect;

	// Geser kembali pusat koordinat dari tengah (-0.5, 0.5) ke pojok bawah (0.0, 1.0)
	rotatedUV += vec2(0.5);

	// 6. Cek batas koordinat (Clamping)
	// Jika koordinat hasil rotasi berada di luar gambar (kurang dari 0 atau lebih dari 1), 
	// kita beri warna hitam transparan agar sisa layar bersih.
	if (rotatedUV.x < 0.0 || rotatedUV.x > 1.0 || rotatedUV.y < 0.0 || rotatedUV.y > 1.0) {
		gl_FragColor = vec4(0.0);
	} else {
		// Ambil piksel dari gambar input berdasarkan koordinat 3D baru
		gl_FragColor = IMG_NORM_PIXEL(inputImage, rotatedUV);
	}
}