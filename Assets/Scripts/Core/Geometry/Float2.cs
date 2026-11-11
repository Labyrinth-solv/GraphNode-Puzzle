using System;

namespace GraphNode.Core.Geometry
{
    /// <summary>
    /// Toạ độ 2D của lõi, tính theo bề rộng khung vải (0–1, trục dọc hướng xuống như dữ liệu level).
    /// Core không tham chiếu UnityEngine nên dùng struct riêng; chuyển sang Vector2 ở biên hiển thị.
    /// </summary>
    public readonly struct Float2 : IEquatable<Float2>
    {
        public readonly float X;
        public readonly float Y;

        public Float2(float x, float y)
        {
            X = x;
            Y = y;
        }

        public static readonly Float2 Zero = new Float2(0f, 0f);

        public float LengthSquared => X * X + Y * Y;
        public float Length => MathF.Sqrt(LengthSquared);

        public static Float2 operator +(Float2 a, Float2 b) => new Float2(a.X + b.X, a.Y + b.Y);
        public static Float2 operator -(Float2 a, Float2 b) => new Float2(a.X - b.X, a.Y - b.Y);
        public static Float2 operator -(Float2 a) => new Float2(-a.X, -a.Y);
        public static Float2 operator *(Float2 a, float k) => new Float2(a.X * k, a.Y * k);
        public static Float2 operator *(float k, Float2 a) => new Float2(a.X * k, a.Y * k);
        public static Float2 operator /(Float2 a, float k) => new Float2(a.X / k, a.Y / k);

        public static float Dot(Float2 a, Float2 b) => a.X * b.X + a.Y * b.Y;

        /// <summary>Tích có hướng (thành phần z), dùng cho chiều vòng và giao đoạn.</summary>
        public static float Cross(Float2 a, Float2 b) => a.X * b.Y - a.Y * b.X;

        public static float Distance(Float2 a, Float2 b) => (a - b).Length;

        public static Float2 Lerp(Float2 a, Float2 b, float t) => new Float2(a.X + (b.X - a.X) * t, a.Y + (b.Y - a.Y) * t);

        /// <summary>Vector đơn vị; vector rất ngắn trả về Zero để tránh chia cho 0.</summary>
        public Float2 Normalized()
        {
            float len = Length;
            return len > 1e-9f ? new Float2(X / len, Y / len) : Zero;
        }

        public bool Equals(Float2 other) => X.Equals(other.X) && Y.Equals(other.Y);
        public override bool Equals(object obj) => obj is Float2 other && Equals(other);
        public override int GetHashCode() => HashCode.Combine(X, Y);
        public static bool operator ==(Float2 a, Float2 b) => a.Equals(b);
        public static bool operator !=(Float2 a, Float2 b) => !a.Equals(b);
        public override string ToString() => $"({X:0.####}, {Y:0.####})";
    }
}
