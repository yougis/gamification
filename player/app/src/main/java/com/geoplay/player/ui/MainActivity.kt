package com.geoplay.player.ui

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.NavigationUI
import androidx.drawerlayout.widget.DrawerLayout
import com.geoplay.player.R
import com.geoplay.player.databinding.ActivityMainBinding
import android.view.MenuItem
import androidx.appcompat.app.ActionBarDrawerToggle

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var navController: NavController
    private lateinit var drawerToggle: ActionBarDrawerToggle
    private lateinit var drawerLayout: DrawerLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        drawerLayout = binding.drawerLayout

        val navHostFragment = supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        navController = navHostFragment.navController

        drawerToggle = ActionBarDrawerToggle(
            this, drawerLayout, binding.toolbar,
            R.string.navigation_drawer_open, R.string.navigation_drawer_close
        )
        drawerLayout.addDrawerListener(drawerToggle)
        drawerToggle.syncState()

        NavigationUI.setupWithNavController(binding.navView, navController)
        handleImportDeepLink(intent)
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleImportDeepLink(intent)
    }

    private fun handleImportDeepLink(intent: android.content.Intent?) {
        // Borne QR : geoplay://import?url=<https vers .zip> ou geoplay://<pack-id>.
        // L'ImportFragment lit intent.data / pending_import_url a son ouverture.
        val data = intent?.data ?: return
        if (data.scheme != "geoplay") return
        val url = data.getQueryParameter("url") ?: data.toString()
        intent.putExtra("pending_import_url", url)
        try {
            navController.navigate(R.id.importFragment)
        } catch (e: Exception) {
            // Nav pas encore prete : l'extra sera lu a l'ouverture manuelle de l'import.
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        return NavigationUI.navigateUp(navController, drawerLayout) || super.onSupportNavigateUp()
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (drawerToggle.onOptionsItemSelected(item)) return true
        return super.onOptionsItemSelected(item)
    }
}