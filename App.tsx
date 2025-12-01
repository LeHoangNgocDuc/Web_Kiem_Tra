<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thi Trắc Nghiệm Online</title>
    
    <script src="https://cdn.tailwindcss.com"></script>
    
    <script>
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\(', '\\)']], // Nhận diện công thức dòng
          displayMath: [['$$', '$$'], ['\\[', '\\]']], // Nhận diện công thức khối
          processEscapes: true
        },
        svg: {
          fontCache: 'global'
        },
        startup: {
          typeset: false // Tắt tự động chạy ban đầu để React kiểm soát
        }
      };
    </script>
    
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>

    <script type="importmap">
    {
      "imports": {
        "react": "https://aistudiocdn.com/react@^19.2.0",
        "react/": "https://aistudiocdn.com/react@^19.2.0/",
        "react-dom": "https://aistudiocdn.com/react-dom@^19.2.0",
        "react-dom/": "https://aistudiocdn.com/react-dom@^19.2.0/"
      }
    }
    </script>
    
    <style>
      /* CSS sửa lỗi ảnh bị tràn */
      .math-content img { max-width: 100%; height: auto; margin: 10px 0; border-radius: 5px; }
      .math-content { font-size: 16px; line-height: 1.6; }
      mjx-container { font-size: 110% !important; } /* Phóng to công thức */
    </style>
  </head>
  <body class="bg-gray-100"><div id="root"></div><script type="module" src="/index.tsx"></script></body>
</html>
