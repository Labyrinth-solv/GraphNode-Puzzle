using UnityEngine;
using UnityEngine.InputSystem;

namespace GraphNode.Gameplay.Input
{
    public enum PointerPhase
    {
        None,
        Began,
        Moved,
        Ended,
        /// <summary>Thao tác bị hủy (mất focus, ứng dụng vào nền): thả mà không áp gì.</summary>
        Cancelled
    }

    /// <summary>
    /// Một ngón tay qua Input System (không dùng UnityEngine.Input): chỉ theo con trỏ đầu tiên chạm xuống cho tới khi nhấc;
    /// mất focus thì hủy thao tác đang kéo. Đọc mỗi khung bằng <see cref="Poll"/>, không phát sự kiện, không cấp phát.
    /// </summary>
    public sealed class PointerInput : MonoBehaviour
    {
        private bool _active;
        private bool _cancelRequested;

        public Vector2 Position { get; private set; }
        public Vector2 StartPosition { get; private set; }
        /// <summary>Thao tác hiện tại đến từ màn hình cảm ứng (nâng node chỉ áp cho cảm ứng, không cho chuột).</summary>
        public bool IsTouch { get; private set; }

        public PointerPhase Poll()
        {
            if (_cancelRequested)
            {
                _cancelRequested = false;
                if (_active)
                {
                    _active = false;
                    return PointerPhase.Cancelled;
                }
            }
            var pointer = Pointer.current;
            if (pointer == null) return _active ? Cancel() : PointerPhase.None;
            bool pressed = pointer.press.isPressed;
            if (!_active)
            {
                if (!pressed || !pointer.press.wasPressedThisFrame) return PointerPhase.None;
                _active = true;
                IsTouch = pointer is Touchscreen;
                Position = StartPosition = pointer.position.ReadValue();
                return PointerPhase.Began;
            }
            Position = pointer.position.ReadValue();
            if (pressed) return PointerPhase.Moved;
            _active = false;
            return PointerPhase.Ended;
        }

        private PointerPhase Cancel()
        {
            _active = false;
            return PointerPhase.Cancelled;
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (!hasFocus) _cancelRequested = true;
        }

        private void OnApplicationPause(bool paused)
        {
            if (paused) _cancelRequested = true;
        }
    }
}
