namespace GraphNode.Core.Generation
{
    /// <summary>
    /// RNG có hạt giống, tất định trên mọi máy: băm FNV-1a 32 bit của khóa rồi sinh theo mulberry32. Cùng khóa cho cùng
    /// dãy số với trình sinh của bản web, để sinh lại đúng vị trí đầu đã ghi trong file level.
    /// </summary>
    public sealed class SeededRandom
    {
        private uint _state;

        public SeededRandom(string key)
        {
            uint h = 2166136261u;
            foreach (char c in key)
            {
                h ^= c;
                h = unchecked(h * 16777619u);
            }
            _state = h;
        }

        public SeededRandom(int seed) => _state = unchecked((uint)seed);

        /// <summary>Số trong [0, 1).</summary>
        public double NextDouble()
        {
            unchecked
            {
                _state += 0x6D2B79F5u;
                uint t = _state;
                t = (t ^ (t >> 15)) * (t | 1u);
                t ^= t + (t ^ (t >> 7)) * (t | 61u);
                return (t ^ (t >> 14)) / 4294967296.0;
            }
        }
    }
}
