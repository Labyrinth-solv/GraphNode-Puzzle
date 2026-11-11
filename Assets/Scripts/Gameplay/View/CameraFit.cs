using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>
    /// Giữ trọn bố cục 390×844 pt trong màn hình ở mọi tỉ lệ: camera trực giao, cao tối thiểu 844 pt và rộng tối thiểu
    /// 390 pt; màn hình dài hay rộng hơn thì lộ thêm nền.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public sealed class CameraFit : MonoBehaviour
    {
        [SerializeField] private Color background = new Color32(0xF6, 0xEF, 0xE3, 0xFF);

        private Camera _camera;
        private int _w, _h;

        private void Awake()
        {
            _camera = GetComponent<Camera>();
            _camera.orthographic = true;
            _camera.clearFlags = CameraClearFlags.SolidColor;
            _camera.backgroundColor = background;
            transform.position = new Vector3(0f, 0f, -10f);
            Fit();
        }

        private void Update()
        {
            if (Screen.width != _w || Screen.height != _h) Fit();
        }

        private void Fit()
        {
            _w = Screen.width;
            _h = Screen.height;
            float aspect = _h > 0 ? (float)_w / _h : 1f;
            _camera.orthographicSize = Mathf.Max(FabricLayout.ScreenHeight / 2f, FabricLayout.ScreenWidth / 2f / aspect);
        }

        /// <summary>Số pt của bố cục ứng với một điểm ảnh màn hình (để quy đổi quãng trượt ngón tay).</summary>
        public float PointsPerPixel => _h > 0 ? 2f * _camera.orthographicSize / _h : 1f;
    }
}
