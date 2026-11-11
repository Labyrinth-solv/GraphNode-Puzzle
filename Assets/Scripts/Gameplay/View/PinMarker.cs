using UnityEngine;

namespace GraphNode.Gameplay.View
{
    /// <summary>Chốt trên viền mẫu (prefab Pin): sprite chốt trống và chốt đã có node, đổi theo trạng thái.</summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public sealed class PinMarker : MonoBehaviour
    {
        [SerializeField] private Sprite empty;
        [SerializeField] private Sprite filled;

        private SpriteRenderer _renderer;
        private bool _filled;

        private void Awake()
        {
            _renderer = GetComponent<SpriteRenderer>();
            _renderer.sprite = empty;
        }

        public void SetFilled(bool value)
        {
            if (_renderer == null) Awake();
            if (value == _filled) return;
            _filled = value;
            _renderer.sprite = value ? filled : empty;
        }

        public void SetVisible(bool visible)
        {
            if (_renderer == null) Awake();
            _renderer.enabled = visible;
        }
    }
}
