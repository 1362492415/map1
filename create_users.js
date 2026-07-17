/**
 * Bmob 批量注册用户脚本
 * 
 * 使用方法：
 * 1. 在浏览器中打开 index.html 页面。
 * 2. 打开开发者工具（F12），切换到 Console (控制台) 标签页。
 * 3. 将本文件的所有代码复制并粘贴到控制台中。
 * 4. 按回车键执行。
 * 
 * 脚本会自动完成7个账号的注册，并在控制台输出结果。
 */

async function createUsers() {
  // --- 配置信息 ---
  const usersToCreate = [
    { username: 'unit1', password: 'password123' },
    { username: 'unit2', password: 'password123' },
    { username: 'unit3', password: 'password123' },
    { username: 'unit4', password: 'password123' },
    { username: 'unit5', password: 'password123' },
    { username: 'unit6', password: 'password123' },
    { username: 'unit7', password: 'password123' },
  ];

  // --- 执行注册 ---
  console.log('--- 开始批量注册用户 ---');
  
  const results = [];

  for (const userData of usersToCreate) {
    try {
      // 使用新版 SDK 的注册语法
      let params = {
        username: userData.username,
        password: userData.password
      };
      
      await Bmob.User.register(params);
      
      results.push({ 
        username: userData.username, 
        password: userData.password, 
        status: '✅ 成功' 
      });

    } catch (error) {
      // Bmob code 202: 用户名已存在
      if (error.code === 202) {
        results.push({ 
          username: userData.username, 
          password: userData.password, 
          status: '⚠️ 已存在，跳过' 
        });
      } else {
        results.push({ 
          username: userData.username, 
          status: `❌ 失败`, 
          error: error.message 
        });
      }
    }
    // Bmob API 有频率限制，稍作延迟
    await new Promise(resolve => setTimeout(resolve, 200)); 
  }

  // --- 输出结果 ---
  console.log('--- 批量注册完成 ---');
  console.table(results);
  console.log('请使用以上账号密码进行登录测试。');
}

// 自动执行
createUsers();
